from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models.client import Client
from ..models.declaration import SimplesDeclaracao
from ..schemas.client import ClientOut
from ..routers.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=List[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(
        Client,
        func.count(SimplesDeclaracao.id).label("total_decl"),
        func.max(SimplesDeclaracao.competencia).label("ultima_comp"),
    ).outerjoin(SimplesDeclaracao, SimplesDeclaracao.client_id == Client.id
    ).group_by(Client.id).order_by(Client.nome).all()

    result = []
    for client, total, ultima in rows:
        result.append(ClientOut(
            id=client.id,
            cnpj=client.cnpj,
            nome=client.nome,
            municipio=client.municipio,
            uf=client.uf,
            total_declaracoes=total,
            ultima_competencia=ultima,
        ))
    return result
