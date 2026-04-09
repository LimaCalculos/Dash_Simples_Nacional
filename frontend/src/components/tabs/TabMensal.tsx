import { useState } from 'react'
import { CheckCircle, XCircle, MinusCircle, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useDashboardMensal } from '../../hooks'
import StatCard from '../dashboard/StatCard'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function TabMensal() {
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState(currentYear)
  const { data, isLoading } = useDashboardMensal(ano)
  const nowMonth = new Date().toISOString().slice(0, 7)

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* Filtro de ano */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-dark-400 text-sm font-medium">Ano:</label>
        <div className="flex gap-2">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setAno(y)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                ano === y
                  ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30'
                  : 'text-dark-400 hover:bg-dark-800 border border-transparent'
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center h-64 text-dark-400">Carregando...</div>}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Cobertura Geral"
              value={`${data.cobertura_geral_pct}%`}
              icon={TrendingUp}
              color={data.cobertura_geral_pct >= 90 ? 'green' : data.cobertura_geral_pct >= 60 ? 'amber' : 'red'}
              subtitle={`${data.ano} — meses até hoje`}
            />
            <StatCard title="Clientes em dia" value={data.clientes_completos} icon={Users} color="green"
              subtitle="Declararam todos os meses" />
            <StatCard title="Clientes com pendência" value={data.clientes_pendentes} icon={AlertTriangle}
              color={data.clientes_pendentes > 0 ? 'red' : 'green'}
              subtitle="Falta pelo menos 1 declaração" />
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-5 text-xs text-dark-400">
            <div className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-400" /> Declaração presente</div>
            <div className="flex items-center gap-1.5"><XCircle size={13} className="text-red-400" /> Declaração ausente</div>
            <div className="flex items-center gap-1.5"><MinusCircle size={13} className="text-dark-600" /> Mês futuro</div>
          </div>

          {/* Matriz */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="px-4 py-3 text-left text-dark-400 font-medium uppercase tracking-wider sticky left-0 bg-dark-900 min-w-[200px]">
                      Cliente
                    </th>
                    {data.meses.map(m => {
                      const idx = parseInt(m.split('-')[1]) - 1
                      return (
                        <th key={m} className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[50px]">
                          {MONTH_NAMES[idx]}
                        </th>
                      )
                    })}
                    <th className="px-4 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[70px]">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientes.map(cliente => (
                    <tr key={cliente.client_id} className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors">
                      <td className="px-4 py-2.5 sticky left-0 bg-dark-900">
                        <div className="font-medium text-dark-200 truncate max-w-[190px]">{cliente.nome}</div>
                        <div className="text-dark-500 text-[10px]">{cliente.cnpj}</div>
                      </td>
                      {data.meses.map(m => {
                        const isFuture = m > nowMonth
                        const hasDecl = cliente.meses[m]
                        return (
                          <td key={m} className="px-3 py-2.5 text-center">
                            {isFuture ? (
                              <MinusCircle size={15} className="text-dark-700 mx-auto" />
                            ) : hasDecl ? (
                              <CheckCircle size={15} className="text-green-400 mx-auto" />
                            ) : (
                              <XCircle size={15} className="text-red-400 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-center">
                        <span className={clsx(
                          'font-semibold',
                          cliente.cobertura_pct === 100 ? 'text-green-400' :
                          cliente.cobertura_pct >= 60 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {cliente.cobertura_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.clientes.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-10 text-center text-dark-500">
                        Nenhuma declaração encontrada para {ano}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
