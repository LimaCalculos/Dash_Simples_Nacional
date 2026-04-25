"""
serpro_lib.py — Cliente Serpro Integra Contador
Suporta mTLS via:
  - SERPRO_CERT_B64: base64 do arquivo .pfx (para Render/produção)
  - SERPRO_CERT_PATH: caminho local do .pfx (para desenvolvimento)
"""

import base64, json, os, re, tempfile, time, hashlib, zlib
from typing import Optional, Dict, Any, List, Tuple

import httpx

CNPJ_CONTRATANTE = "30226273000110"
TOKEN_URL         = "https://autenticacao.sapi.serpro.gov.br/authenticate"
CONSULTAR_URL     = "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar"

_token_cache: Dict[str, Dict] = {}
_cert_files: Optional[Tuple[str, str]] = None   # (cert_pem_path, key_pem_path)
_cert_attempted = False


# ── mTLS ──────────────────────────────────────────────────────────────────────

def _get_cert_files() -> Optional[Tuple[str, str]]:
    """Extrai o PFX e devolve (cert.pem, key.pem) em arquivos temporários."""
    global _cert_files, _cert_attempted
    if _cert_attempted:
        return _cert_files
    _cert_attempted = True

    cert_b64  = os.environ.get("SERPRO_CERT_B64", "").strip()
    cert_path = os.environ.get("SERPRO_CERT_PATH",
        r"C:/Users/allkb/Downloads/Certificados Digitais/1001265665(contabilize) senha 12345678.pfx")
    cert_pass = os.environ.get("SERPRO_CERT_PASSWORD", "12345678")

    try:
        if cert_b64:
            pfx_data = base64.b64decode(cert_b64)
            print("[Serpro] Certificado carregado da variável de ambiente.")
        elif os.path.exists(cert_path):
            with open(cert_path, "rb") as f:
                pfx_data = f.read()
            print("[Serpro] Certificado carregado do disco local.")
        else:
            print("[Serpro] Certificado não encontrado — sem mTLS")
            return None

        from cryptography.hazmat.primitives.serialization import (
            pkcs12, Encoding, PrivateFormat, NoEncryption,
        )
        private_key, cert, _ = pkcs12.load_key_and_certificates(
            pfx_data, cert_pass.encode()
        )
        cert_pem = cert.public_bytes(Encoding.PEM)
        key_pem  = private_key.private_bytes(
            Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
        )

        with tempfile.NamedTemporaryFile(suffix=".pem", delete=False, mode="wb") as cf:
            cf.write(cert_pem)
            cert_file = cf.name
        with tempfile.NamedTemporaryFile(suffix=".key", delete=False, mode="wb") as kf:
            kf.write(key_pem)
            key_file = kf.name

        _cert_files = (cert_file, key_file)
        print("[Serpro] mTLS pronto — cert:", cert_file)
        return _cert_files

    except Exception as e:
        import traceback
        print(f"[Serpro] Erro ao preparar mTLS: {e}")
        traceback.print_exc()
        return None


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _post(url: str, body: str | bytes, headers: Dict[str, str]) -> Any:
    cert = _get_cert_files()
    # 'cert' envia o certificado do cliente (mTLS); 'verify=True' valida o servidor
    with httpx.Client(cert=cert, verify=True, timeout=30) as client:
        r = client.post(
            url,
            content=body if isinstance(body, bytes) else body.encode(),
            headers=headers,
        )
    if r.status_code >= 400:
        raise Exception(f"HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


# ── Token OAuth2 ──────────────────────────────────────────────────────────────

def get_token(consumer_key: str, consumer_secret: str) -> Dict[str, str]:
    key = hashlib.md5(f"{consumer_key}:{consumer_secret}".encode()).hexdigest()
    cached = _token_cache.get(key)
    if cached and time.time() < cached["expires_at"] - 120:
        return {"access_token": cached["access_token"], "jwt_token": cached["jwt_token"]}

    creds = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
    data  = _post(TOKEN_URL, "grant_type=client_credentials", {
        "Authorization": f"Basic {creds}",
        "Role-Type":     "TERCEIROS",
        "Content-Type":  "application/x-www-form-urlencoded",
    })
    if not data.get("access_token"):
        raise Exception("Resposta de autenticação inválida do Serpro")

    _token_cache[key] = {
        "access_token": data["access_token"],
        "jwt_token":    data.get("jwt_token", ""),
        "expires_at":   time.time() + data.get("expires_in", 2000),
    }
    return {"access_token": data["access_token"], "jwt_token": data.get("jwt_token", "")}


def invalidate_token(consumer_key: str, consumer_secret: str):
    _token_cache.pop(hashlib.md5(f"{consumer_key}:{consumer_secret}".encode()).hexdigest(), None)


# ── Consultar helper ──────────────────────────────────────────────────────────

def _consultar(payload: Dict, access_token: str, jwt_token: str) -> Any:
    headers: Dict[str, str] = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }
    if jwt_token:
        headers["jwt_token"] = jwt_token

    res = _post(CONSULTAR_URL, json.dumps(payload), headers)

    if isinstance(res, dict) and res.get("status", 0) >= 400:
        msgs = "; ".join(m.get("texto", "") for m in res.get("mensagens", []))
        raise Exception(f"Serpro {res['status']}: {msgs}")

    return res


# ── Extração de valor do DAS (zlib + PDF Tj operators) ───────────────────────

def _extrair_celulas(pdf_base64: str) -> List[str]:
    pdf_bytes = base64.b64decode(pdf_base64)
    pdf_str   = pdf_bytes.decode("latin-1", errors="replace")
    cells: List[str] = []

    for m in re.finditer(r"stream\r?\n([\s\S]*?)\r?\nendstream", pdf_str):
        try:
            txt = zlib.decompress(m.group(1).encode("latin-1")).decode("latin-1")
            if "Tj" not in txt:
                continue
            for t in re.finditer(r"\(([^)]*)\)\s*Tj", txt):
                val = t.group(1).strip()
                if val:
                    cells.append(val)
        except Exception:
            pass

    return cells


def _extrair_valor_total(cells: List[str]) -> Optional[str]:
    headers     = ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS", "Total"]
    num_pattern = re.compile(r"^\d{1,3}(?:\.\d{3})*,\d{2}$")

    try:
        idx = cells.index("IRPJ")
    except ValueError:
        return None

    if cells[idx: idx + 9] != headers:
        return None

    vals = []
    for v in cells[idx + 9:]:
        if num_pattern.match(v):
            vals.append(v)
            if len(vals) == 9:
                break
        elif vals:
            break

    return vals[-1] if vals else None


# ── API calls ─────────────────────────────────────────────────────────────────

def consultar_procuracao(cnpj: str, cnpj_contador: str, key: str, secret: str) -> Dict:
    tokens = get_token(key, secret)
    c  = re.sub(r"\D", "", cnpj)
    cc = re.sub(r"\D", "", cnpj_contador)

    raw = _consultar({
        "contratante":      {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "autorPedidoDados": {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "contribuinte":     {"numero": c, "tipo": 2},
        "pedidoDados": {
            "idSistema": "PROCURACOES", "idServico": "OBTERPROCURACAO41",
            "versaoSistema": "1.0",
            "dados": json.dumps({"outorgante": c, "tipoOutorgante": "2",
                                  "outorgado": cc, "tipoOutorgado": "2"}),
        },
    }, tokens["access_token"], tokens["jwt_token"])

    procs: List[Dict] = []
    try:
        d = raw.get("dados", "[]")
        procs = json.loads(d) if isinstance(d, str) else d
        if not isinstance(procs, list):
            procs = [procs]
    except Exception:
        procs = []

    proc   = procs[0] if procs else {}
    dt_exp = proc.get("dtexpiracao") or proc.get("dtExpiracao")
    ativa  = len(procs) > 0

    if ativa and dt_exp:
        from datetime import datetime
        try:
            ativa = datetime.strptime(dt_exp[:8], "%Y%m%d") >= datetime.now()
        except Exception:
            pass

    return {"cnpjContribuinte": c, "cnpjContador": cc,
            "ativa": ativa, "dtExpiracao": dt_exp, "sistemas": proc.get("sistemas") or []}


def _extrato_das(cnpj: str, numero_das: str, key: str, secret: str) -> Dict:
    tokens    = get_token(key, secret)
    c         = re.sub(r"\D", "", cnpj)
    das_clean = re.sub(r"\D", "", numero_das)

    raw = _consultar({
        "contratante":      {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "autorPedidoDados": {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "contribuinte":     {"numero": c, "tipo": 2},
        "pedidoDados": {
            "idSistema": "PGDASD", "idServico": "CONSEXTRATO16",
            "versaoSistema": "1.0",
            "dados": json.dumps({"cnpj": c, "numeroDas": das_clean}),
        },
    }, tokens["access_token"], tokens["jwt_token"])

    parsed: Dict = {}
    try:
        d = raw.get("dados", "{}")
        parsed = json.loads(d) if isinstance(d, str) else d
    except Exception:
        pass

    extrato = parsed.get("extrato", {})
    return {"pdfBase64": extrato.get("pdf", ""),
            "nomeArquivo": extrato.get("nomeArquivo", f"PGDASD-EXTRATO-{das_clean}.pdf")}


def consultar_declaracoes(cnpj: str, ano: int, key: str, secret: str) -> Dict:
    tokens = get_token(key, secret)
    c      = re.sub(r"\D", "", cnpj)

    raw = _consultar({
        "contratante":      {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "autorPedidoDados": {"numero": CNPJ_CONTRATANTE, "tipo": 2},
        "contribuinte":     {"numero": c, "tipo": 2},
        "pedidoDados": {
            "idSistema": "PGDASD", "idServico": "CONSDECLARACAO13",
            "versaoSistema": "1.0",
            "dados": json.dumps({"cnpj": c, "anoCalendario": str(ano)}),
        },
    }, tokens["access_token"], tokens["jwt_token"])

    parsed: Dict = {}
    try:
        d = raw.get("dados", "{}")
        parsed = json.loads(d) if isinstance(d, str) else d
    except Exception:
        pass

    periodos = []
    for p in parsed.get("periodos", []):
        ops = p.get("operacoes", [])
        declaracoes = [
            {"numeroDeclaracao": op["indiceDeclaracao"]["numeroDeclaracao"],
             "dataHoraTransmissao": op["indiceDeclaracao"]["dataHoraTransmissao"],
             "tipoOperacao": op["tipoOperacao"]}
            for op in ops if op.get("indiceDeclaracao")
        ]
        das_ops = [op for op in ops if op.get("indiceDas")]
        ultimo  = das_ops[-1] if das_ops else None
        das     = None
        if ultimo:
            das = {"numeroDas": ultimo["indiceDas"]["numeroDas"],
                   "dataEmissao": ultimo["indiceDas"]["datahoraEmissaoDas"],
                   "pago": ultimo["indiceDas"]["dasPago"] is True,
                   "tipoOperacao": ultimo["tipoOperacao"]}

        periodos.append({"periodoApuracao": p["periodoApuracao"],
                          "declaracoes": declaracoes, "das": das, "valorDas": None})

    # Busca valor dos DAS não pagos via CONSEXTRATO16
    for p in periodos:
        das = p["das"]
        if das and not das["pago"] and das["numeroDas"]:
            try:
                extrato = _extrato_das(c, das["numeroDas"], key, secret)
                if extrato["pdfBase64"]:
                    cells        = _extrair_celulas(extrato["pdfBase64"])
                    p["valorDas"] = _extrair_valor_total(cells)
            except Exception as e:
                print(f"[Serpro] CONSEXTRATO16 erro DAS {das['numeroDas']}: {e}")

    return {"cnpj": c, "anoCalendario": parsed.get("anoCalendario", ano), "periodos": periodos}
