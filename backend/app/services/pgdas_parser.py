"""
Parser for PGDAS-D PDF declarations.

Tested against real PDF format (April 2026):
  PGDASD-DECLARACAO-30226273202603001.pdf
  PGDASD-DECLARACAO-29709174202603001.pdf

Filename convention: PGDASD-DECLARACAO-{cnpj_raiz_8}{YYYY}{MM}{seq}.pdf
"""
import re
import io
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import pdfplumber

logger = logging.getLogger(__name__)


@dataclass
class PgdasData:
    cnpj: str
    cnpj_raiz: str
    nome: str
    competencia: str           # YYYY-MM
    num_declaracao: str
    num_recibo: Optional[str]
    autenticacao: Optional[str]
    data_transmissao: Optional[datetime]
    municipio: Optional[str]
    uf: Optional[str]
    data_abertura: Optional[str]
    # Receitas
    receita_bruta_pa: float
    rbt12: float
    rba: float
    rbaa: float
    # Tributos (Total Geral — seção 2.8 exigível)
    valor_total: float
    irpj: float
    csll: float
    cofins: float
    pis: float
    cpp: float
    icms: float
    ipi: float
    iss: float
    aliquota_efetiva: float


def _br_float(value: str) -> float:
    """Convert Brazilian currency string to float: '1.010,24' → 1010.24"""
    if not value:
        return 0.0
    cleaned = value.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _extract_competencia_from_filename(filename: str) -> Optional[str]:
    """
    Extract competencia from filename pattern:
    PGDASD-DECLARACAO-{cnpj_raiz_8}{YYYY}{MM}{seq}.pdf
    e.g. PGDASD-DECLARACAO-29709174202603001.pdf → 2026-03
    """
    m = re.search(r'DECLARACAO-(\d{8})(\d{4})(\d{2})\d+', filename, re.IGNORECASE)
    if m:
        year, month = m.group(2), m.group(3)
        return f"{year}-{month}"
    return None


def parse_pgdas_pdf(pdf_bytes: bytes, drive_file_name: str = "") -> Optional[PgdasData]:
    """
    Parse a PGDAS-D PDF from bytes and return structured data.
    Returns None if the PDF cannot be parsed.
    """
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # Extract all text from all pages
            full_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
    except Exception as e:
        logger.error(f"Failed to open PDF {drive_file_name}: {e}")
        return None

    if not full_text.strip():
        logger.warning(f"Empty text extracted from {drive_file_name}")
        return None

    try:
        return _parse_text(full_text, drive_file_name)
    except Exception as e:
        logger.error(f"Failed to parse PGDAS text from {drive_file_name}: {e}")
        logger.debug(f"Raw text:\n{full_text[:2000]}")
        return None


def _parse_text(text: str, filename: str) -> Optional[PgdasData]:
    # ── CNPJ ────────────────────────────────────────────────────────────────
    cnpj_match = re.search(r'CNPJ Matriz:\s*([\d.\/\-]+)', text)
    if not cnpj_match:
        logger.warning(f"CNPJ not found in {filename}")
        return None
    cnpj = cnpj_match.group(1).strip()
    cnpj_raiz = re.sub(r'\D', '', cnpj)[:8]

    # ── Nome empresarial ─────────────────────────────────────────────────────
    nome_match = re.search(r'Nome empresarial:\s*(.+)', text)
    nome = nome_match.group(1).strip() if nome_match else "Desconhecido"

    # ── Data abertura ─────────────────────────────────────────────────────────
    abertura_match = re.search(r'Data de abertura no CNPJ:\s*([\d/]+)', text)
    data_abertura = abertura_match.group(1).strip() if abertura_match else None

    # ── Competência ───────────────────────────────────────────────────────────
    # Try filename first (most reliable)
    competencia = _extract_competencia_from_filename(filename)
    if not competencia:
        # Fallback: parse "Período de Apuração: 01/03/2026 a 31/03/2026"
        periodo_match = re.search(r'Per[ií]odo de Apura[çc][ãa]o:\s*\d{2}/(\d{2}/\d{4})', text)
        if periodo_match:
            parts = periodo_match.group(1).split("/")
            competencia = f"{parts[1]}-{parts[0]}"
        else:
            logger.warning(f"Could not determine competencia for {filename}")
            competencia = "0000-00"

    # ── Nº Declaração ─────────────────────────────────────────────────────────
    decl_match = re.search(r'N[ºo°]\s*da Declara[çc][ãa]o:\s*(\d+)', text)
    num_declaracao = decl_match.group(1).strip() if decl_match else ""

    # ── Nº Recibo (appears multiple times, take first) ────────────────────────
    recibo_match = re.search(r'N[ºo°]\s*(?:do\s+)?Recibo:\s*([\d\.\-]+)', text)
    num_recibo = recibo_match.group(1).strip() if recibo_match else None

    # ── Autenticação ──────────────────────────────────────────────────────────
    auth_match = re.search(r'Autentica[çc][ãa]o:\s*([\d\.]+)', text)
    autenticacao = auth_match.group(1).strip() if auth_match else None

    # ── Data/hora transmissão (page 3) ────────────────────────────────────────
    transm_match = re.search(
        r'Data e hor[aá]rio da transmiss[ãa]o.*?:\s*(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})',
        text
    )
    data_transmissao = None
    if transm_match:
        try:
            data_transmissao = datetime.strptime(transm_match.group(1).strip(), "%d/%m/%Y %H:%M:%S")
        except ValueError:
            pass

    # ── Município / UF ────────────────────────────────────────────────────────
    mun_match = re.search(r'Munic[ií]pio:\s*(.+?)\s+UF:\s*([A-Z]{2})', text)
    municipio = mun_match.group(1).strip() if mun_match else None
    uf = mun_match.group(2).strip() if mun_match else None

    # ── Receitas ──────────────────────────────────────────────────────────────
    # Pattern: label followed by value (Mercado Interno) then 0,00 then Total
    # "Receita Bruta do PA (RPA) - Competência  74.270,88  0,00  74.270,88"
    rpa_match = re.search(
        r'Receita Bruta do PA.*?Compet[êe]ncia\s+([\d.,]+)', text
    )
    receita_bruta_pa = _br_float(rpa_match.group(1)) if rpa_match else 0.0

    rbt12_match = re.search(
        r'Receita bruta acumulada nos doze meses anteriores\s+ao PA \(RBT12\)\s+([\d.,]+)', text
    )
    rbt12 = _br_float(rbt12_match.group(1)) if rbt12_match else 0.0

    rba_match = re.search(
        r'Receita bruta acumulada no ano-calend[aá]rio corrente\s+\(RBA\)\s+([\d.,]+)', text
    )
    rba = _br_float(rba_match.group(1)) if rba_match else 0.0

    rbaa_match = re.search(
        r'Receita bruta acumulada no ano-calend[aá]rio anterior\s+\(RBAA\)\s+([\d.,]+)', text
    )
    rbaa = _br_float(rbaa_match.group(1)) if rbaa_match else 0.0

    # ── Tributos — Total Geral da Empresa (seção 2.8, Total do Débito Exigível) ──
    # Strategy: find the LAST occurrence of the tributo table (section 2.8 is at the end)
    # Table header: "IRPJ CSLL COFINS PIS/Pasep INSS/CPP ICMS IPI ISS Total"
    # Next non-empty line after header: values
    tributo_pattern = re.compile(
        r'IRPJ\s+CSLL\s+COFINS\s+PIS/Pasep\s+INSS/CPP\s+ICMS\s+IPI\s+ISS\s+Total\s*\n\s*'
        r'([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)'
    )
    # Find all matches, use last one (Total Geral da Empresa / débito exigível)
    tributo_matches = list(tributo_pattern.finditer(text))

    irpj = csll = cofins = pis = cpp = icms = ipi = iss = valor_total = 0.0
    if tributo_matches:
        m = tributo_matches[-1]  # last = "Total do Débito Exigível" of section 2.8
        irpj = _br_float(m.group(1))
        csll = _br_float(m.group(2))
        cofins = _br_float(m.group(3))
        pis = _br_float(m.group(4))
        cpp = _br_float(m.group(5))
        icms = _br_float(m.group(6))
        ipi = _br_float(m.group(7))
        iss = _br_float(m.group(8))
        valor_total = _br_float(m.group(9))
    else:
        # Fallback: "Valor Total do Débito Declarado (R$)" from section 2.6
        resumo_match = re.search(
            r'[\d.,]+\s+([\d.,]+)\s*$',
            _find_section(text, "Resumo da Declara")
        )
        if resumo_match:
            valor_total = _br_float(resumo_match.group(1))

    # ── Alíquota efetiva ──────────────────────────────────────────────────────
    aliquota_efetiva = round((valor_total / receita_bruta_pa * 100), 4) if receita_bruta_pa else 0.0

    return PgdasData(
        cnpj=cnpj,
        cnpj_raiz=cnpj_raiz,
        nome=nome,
        competencia=competencia,
        num_declaracao=num_declaracao,
        num_recibo=num_recibo,
        autenticacao=autenticacao,
        data_transmissao=data_transmissao,
        municipio=municipio,
        uf=uf,
        data_abertura=data_abertura,
        receita_bruta_pa=receita_bruta_pa,
        rbt12=rbt12,
        rba=rba,
        rbaa=rbaa,
        valor_total=valor_total,
        irpj=irpj,
        csll=csll,
        cofins=cofins,
        pis=pis,
        cpp=cpp,
        icms=icms,
        ipi=ipi,
        iss=iss,
        aliquota_efetiva=aliquota_efetiva,
    )


def _find_section(text: str, section_name: str) -> str:
    """Extract text starting from a section heading until the next blank line block."""
    idx = text.find(section_name)
    if idx == -1:
        return ""
    chunk = text[idx:idx + 500]
    return chunk


def is_pgdas_file(filename: str) -> bool:
    """PGDAS-D declaration: PGDASD-DECLARACAO-*.pdf"""
    upper = filename.upper()
    return upper.startswith("PGDASD-DECLARACAO-") and upper.endswith(".PDF")


def is_das_file(filename: str) -> bool:
    """DAS payment guide: PGDASD-DAS-*.pdf or DAS-*.pdf or DAS_*.pdf"""
    upper = filename.upper()
    return (
        upper.startswith("PGDASD-DAS-") or
        upper.startswith("DAS-") or
        upper.startswith("DAS_")
    ) and upper.endswith(".PDF")
