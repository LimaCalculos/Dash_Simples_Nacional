import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, clientsApi, driveApi } from '../api/endpoints'

export const useDashboardGeral = () =>
  useQuery({ queryKey: ['dashboard-geral'], queryFn: () => dashboardApi.geral().then(r => r.data), refetchInterval: 30_000 })

export const useDashboardMensal = (ano?: number) =>
  useQuery({ queryKey: ['dashboard-mensal', ano], queryFn: () => dashboardApi.mensal(ano).then(r => r.data), refetchInterval: 30_000 })

export const useDashboardCliente = (client_id?: number) =>
  useQuery({
    queryKey: ['dashboard-cliente', client_id],
    queryFn: () => dashboardApi.cliente(client_id!).then(r => r.data),
    enabled: !!client_id,
  })

export const useClients = () =>
  useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list().then(r => r.data) })

export const useDriveStatus = () =>
  useQuery({ queryKey: ['drive-status'], queryFn: () => driveApi.status().then(r => r.data), refetchInterval: 10_000 })

export const useSyncNow = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => driveApi.syncNow(),
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['dashboard-geral'] })
        qc.invalidateQueries({ queryKey: ['dashboard-mensal'] })
        qc.invalidateQueries({ queryKey: ['drive-status'] })
        qc.invalidateQueries({ queryKey: ['clients'] })
      }, 3000)
    },
  })
}
