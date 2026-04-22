from pydantic import BaseModel
from typing import List, Optional, Dict


class KpiGeral(BaseModel):
    total_declaracoes: int
    total_clientes: int
    competencias_cobertas: int
    receita_bruta_total: float
    tributos_total: float
    aliquota_media: float
    # by tributo
    irpj_total: float
    csll_total: float
    cofins_total: float
    pis_total: float
    cpp_total: float
    icms_total: float
    ipi_total: float
    iss_total: float
    # Drive sync info
    ultima_sync: Optional[str]
    novos_arquivos_ultima_sync: int


class EvolucaoMensalItem(BaseModel):
    competencia: str        # YYYY-MM
    receita_bruta: float
    tributos: float
    irpj: float
    csll: float
    cofins: float
    pis: float
    cpp: float
    icms: float
    ipi: float
    iss: float
    qtd_declaracoes: int


class KpiGeralResponse(BaseModel):
    kpis: KpiGeral
    evolucao_mensal: List[EvolucaoMensalItem]


class MensalClienteItem(BaseModel):
    client_id: int
    cnpj: str
    nome: str
    meses: Dict[str, bool]     # { "2026-01": True, "2026-02": False, ... }
    total_declarado: int
    total_esperado: int
    cobertura_pct: float
    # Evolução: mês atual vs anterior
    mes_atual: Optional[str] = None          # competência mais recente
    mes_anterior: Optional[str] = None       # competência anterior
    faturamento_atual: Optional[float] = None
    faturamento_anterior: Optional[float] = None
    aliquota_atual: Optional[float] = None
    aliquota_anterior: Optional[float] = None
    variacao_faturamento_pct: Optional[float] = None  # % variação
    variacao_aliquota_pct: Optional[float] = None     # diferença em pontos percentuais


class KpiMensalResponse(BaseModel):
    ano: int
    meses: List[str]            # ["2026-01", ..., "2026-12"]
    clientes: List[MensalClienteItem]
    cobertura_geral_pct: float
    clientes_completos: int     # declared every month so far
    clientes_pendentes: int


class KpiClienteResponse(BaseModel):
    client_id: int
    cnpj: str
    nome: str
    municipio: Optional[str]
    uf: Optional[str]
    competencias_declaradas: int
    receita_total: float
    tributos_total: float
    aliquota_media: float
    rbt12_atual: float
    alerta_sublimite: bool      # RBT12 > 80% of R$ 4.8M
    evolucao: List[EvolucaoMensalItem]
