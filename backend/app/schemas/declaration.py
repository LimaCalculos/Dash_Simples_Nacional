from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DeclaracaoOut(BaseModel):
    id: int
    client_id: int
    competencia: str
    num_declaracao: Optional[str]
    num_recibo: Optional[str]
    data_transmissao: Optional[datetime]
    receita_bruta_pa: float
    rbt12: float
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
    drive_file_name: str
    has_das: bool = False

    class Config:
        from_attributes = True


class DasOut(BaseModel):
    id: int
    client_id: int
    competencia: str
    valor: Optional[float]
    vencimento: Optional[str]
    situacao: str
    drive_file_name: str

    class Config:
        from_attributes = True
