from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClientOut(BaseModel):
    id: int
    cnpj: str
    nome: str
    municipio: Optional[str]
    uf: Optional[str]
    total_declaracoes: int = 0
    ultima_competencia: Optional[str] = None

    class Config:
        from_attributes = True
