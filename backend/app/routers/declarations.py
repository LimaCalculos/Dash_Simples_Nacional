from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.declaration import SimplesDeclaracao, DasDocument
from ..schemas.declaration import DeclaracaoOut, DasOut
from ..routers.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/declarations", tags=["declarations"])


@router.get("", response_model=List[DeclaracaoOut])
def list_declarations(
    client_id: Optional[int] = Query(None),
    competencia: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(SimplesDeclaracao)
    if client_id:
        q = q.filter(SimplesDeclaracao.client_id == client_id)
    if competencia:
        q = q.filter(SimplesDeclaracao.competencia == competencia)
    decls = q.order_by(SimplesDeclaracao.competencia.desc()).all()

    result = []
    for d in decls:
        has_das = db.query(DasDocument).filter_by(declaracao_id=d.id).first() is not None
        result.append(DeclaracaoOut(
            id=d.id, client_id=d.client_id, competencia=d.competencia,
            num_declaracao=d.num_declaracao, num_recibo=d.num_recibo,
            data_transmissao=d.data_transmissao,
            receita_bruta_pa=d.receita_bruta_pa, rbt12=d.rbt12,
            valor_total=d.valor_total, irpj=d.irpj, csll=d.csll,
            cofins=d.cofins, pis=d.pis, cpp=d.cpp,
            icms=d.icms, ipi=d.ipi, iss=d.iss,
            aliquota_efetiva=d.aliquota_efetiva,
            drive_file_name=d.drive_file_name,
            has_das=has_das,
        ))
    return result


@router.get("/das", response_model=List[DasOut])
def list_das(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(DasDocument)
    if client_id:
        q = q.filter(DasDocument.client_id == client_id)
    das = q.order_by(DasDocument.competencia.desc()).all()
    return [DasOut(
        id=d.id, client_id=d.client_id or 0, competencia=d.competencia,
        valor=d.valor, vencimento=str(d.vencimento) if d.vencimento else None,
        situacao=d.situacao, drive_file_name=d.drive_file_name,
    ) for d in das]
