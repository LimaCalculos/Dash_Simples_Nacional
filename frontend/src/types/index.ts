export interface User {
  id: number
  email: string
  name: string
  picture?: string
  is_admin: boolean
}

export interface AuthState {
  token: string | null
  user: User | null
}

export interface Client {
  id: number
  cnpj: string
  nome: string
  municipio?: string
  uf?: string
  total_declaracoes: number
  ultima_competencia?: string
}

export interface Declaracao {
  id: number
  client_id: number
  competencia: string
  num_declaracao?: string
  num_recibo?: string
  data_transmissao?: string
  receita_bruta_pa: number
  rbt12: number
  valor_total: number
  irpj: number
  csll: number
  cofins: number
  pis: number
  cpp: number
  icms: number
  ipi: number
  iss: number
  aliquota_efetiva: number
  drive_file_name: string
  has_das: boolean
}

export interface DasDocument {
  id: number
  client_id: number
  competencia: string
  valor?: number
  vencimento?: string
  situacao: string
  drive_file_name: string
}

export interface EvolucaoMensalItem {
  competencia: string
  receita_bruta: number
  tributos: number
  irpj: number
  csll: number
  cofins: number
  pis: number
  cpp: number
  icms: number
  ipi: number
  iss: number
  qtd_declaracoes: number
}

export interface KpiGeral {
  total_declaracoes: number
  total_clientes: number
  competencias_cobertas: number
  receita_bruta_total: number
  tributos_total: number
  aliquota_media: number
  irpj_total: number
  csll_total: number
  cofins_total: number
  pis_total: number
  cpp_total: number
  icms_total: number
  ipi_total: number
  iss_total: number
  ultima_sync?: string
  novos_arquivos_ultima_sync: number
}

export interface KpiGeralResponse {
  kpis: KpiGeral
  evolucao_mensal: EvolucaoMensalItem[]
}

export interface MensalClienteItem {
  client_id: number
  cnpj: string
  nome: string
  meses: Record<string, boolean>
  total_declarado: number
  total_esperado: number
  cobertura_pct: number
}

export interface KpiMensalResponse {
  ano: number
  meses: string[]
  clientes: MensalClienteItem[]
  cobertura_geral_pct: number
  clientes_completos: number
  clientes_pendentes: number
}

export interface KpiClienteResponse {
  client_id: number
  cnpj: string
  nome: string
  municipio?: string
  uf?: string
  competencias_declaradas: number
  receita_total: number
  tributos_total: number
  aliquota_media: number
  rbt12_atual: number
  alerta_sublimite: boolean
  evolucao: EvolucaoMensalItem[]
}

export interface DriveStatus {
  connected: boolean
  status: string
  ultima_verificacao?: string
  arquivos_processados: number
  arquivos_novos_ultima_sync: number
  last_error?: string
}
