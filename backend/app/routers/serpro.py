"""
Rotas Serpro — Integra Contador
PUT    /api/serpro/credenciais
DELETE /api/serpro/credenciais
GET    /api/serpro/credenciais/status
POST   /api/serpro/procuracao
POST   /api/serpro/declaracoes
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.serpro_creds import SerproCreds
from .auth import get_current_user
import serpro_lib

router = APIRouter(prefix="/api/serpro", tags=["serpro"])

CNPJ_CONTADOR_DEFAULT = "30226273000110"


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_creds(db: Session) -> Optional[SerproCreds]:
    return db.query(SerproCreds).filter(SerproCreds.id == 1).first()


# ── schemas ───────────────────────────────────────────────────────────────────

class CredsBody(BaseModel):
    consumer_key:    str
    consumer_secret: str
    cnpj_contador:   Optional[str] = None


class ProcuracaoBody(BaseModel):
    cnpj: str


class DeclaracoesBody(BaseModel):
    cnpj:          str
    anoCalendario: int


# ── routes ────────────────────────────────────────────────────────────────────

@router.put("/credenciais")
def save_credenciais(
    body: CredsBody,
    db:   Session = Depends(get_db),
    _user = Depends(get_current_user),
):
    row = _get_creds(db)
    if row:
        row.consumer_key    = body.consumer_key.strip()
        row.consumer_secret = body.consumer_secret.strip()
        row.cnpj_contador   = body.cnpj_contador or None
    else:
        row = SerproCreds(
            id=1,
            consumer_key    = body.consumer_key.strip(),
            consumer_secret = body.consumer_secret.strip(),
            cnpj_contador   = body.cnpj_contador or None,
        )
        db.add(row)
    db.commit()
    serpro_lib.invalidate_token(body.consumer_key.strip(), body.consumer_secret.strip())
    return {"ok": True, "message": "Credenciais Serpro salvas"}


@router.delete("/credenciais", status_code=204)
def delete_credenciais(
    db:    Session = Depends(get_db),
    _user = Depends(get_current_user),
):
    row = _get_creds(db)
    if row:
        db.delete(row)
        db.commit()


@router.get("/credenciais/status")
def credenciais_status(
    db:    Session = Depends(get_db),
    _user = Depends(get_current_user),
):
    row = _get_creds(db)
    return {"configured": row is not None, "cnpj_contador": row.cnpj_contador if row else None}


@router.get("/debug/cert")
def debug_cert():
    """Diagnóstico do certificado mTLS (não expõe conteúdo sensível)."""
    import os
    b64 = os.environ.get("SERPRO_CERT_B64", "")
    cert_path = os.environ.get("SERPRO_CERT_PATH", "")

    # Força nova tentativa de carregamento
    serpro_lib._cert_attempted = False
    serpro_lib._cert_files     = None
    cert = serpro_lib._get_cert_files()

    return {
        "serpro_cert_b64_len":   len(b64),
        "serpro_cert_b64_ok":    len(b64) > 100,
        "serpro_cert_path":      cert_path or "(não definido)",
        "cert_loaded":           cert is not None,
        "cert_files":            list(cert) if cert else None,
    }


@router.post("/procuracao")
def procuracao(
    body:  ProcuracaoBody,
    db:    Session = Depends(get_db),
    _user = Depends(get_current_user),
):
    row = _get_creds(db)
    if not row:
        raise HTTPException(422, "Configure as credenciais Serpro primeiro.")
    try:
        result = serpro_lib.consultar_procuracao(
            cnpj         = body.cnpj,
            cnpj_contador= row.cnpj_contador or CNPJ_CONTADOR_DEFAULT,
            key          = row.consumer_key,
            secret       = row.consumer_secret,
        )
        return {"data": result}
    except Exception as e:
        raise HTTPException(502, str(e))


@router.post("/declaracoes")
def declaracoes(
    body:  DeclaracoesBody,
    db:    Session = Depends(get_db),
    _user = Depends(get_current_user),
):
    row = _get_creds(db)
    if not row:
        raise HTTPException(422, "Configure as credenciais Serpro primeiro.")
    try:
        result = serpro_lib.consultar_declaracoes(
            cnpj   = body.cnpj,
            ano    = body.anoCalendario,
            key    = row.consumer_key,
            secret = row.consumer_secret,
        )
        return {"data": result}
    except Exception as e:
        raise HTTPException(502, str(e))
