import api from './index'
import type {
  KpiGeralResponse, KpiMensalResponse, KpiClienteResponse,
  Client, Declaracao, DasDocument, DriveStatus,
} from '../types'

export const authApi = {
  googleLogin: (id_token: string) =>
    api.post('/auth/google', { id_token }),
  me: () => api.get('/auth/me'),
}

export const dashboardApi = {
  geral: () => api.get<KpiGeralResponse>('/api/dashboard/geral'),
  mensal: (ano?: number) => api.get<KpiMensalResponse>('/api/dashboard/mensal', { params: { ano } }),
  cliente: (client_id: number) => api.get<KpiClienteResponse>(`/api/dashboard/cliente/${client_id}`),
}

export const clientsApi = {
  list: () => api.get<Client[]>('/api/clients'),
}

export const declaracoesApi = {
  list: (client_id?: number, competencia?: string) =>
    api.get<Declaracao[]>('/api/declarations', { params: { client_id, competencia } }),
  das: (client_id?: number) =>
    api.get<DasDocument[]>('/api/declarations/das', { params: { client_id } }),
}

export const driveApi = {
  status: () => api.get<DriveStatus>('/api/drive/status'),
  syncNow: () => api.post('/api/drive/sync-now'),
}
