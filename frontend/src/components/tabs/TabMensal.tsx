import { useState } from 'react'
import { CheckCircle, XCircle, MinusCircle, Users, TrendingUp, AlertTriangle, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import { useDashboardMensal } from '../../hooks'
import StatCard from '../dashboard/StatCard'
import type { MensalClienteItem } from '../../types'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => `${v.toFixed(2)}%`

function MesLabel(mes?: string) {
  if (!mes) return '—'
  const [, m] = mes.split('-')
  return MONTH_NAMES[parseInt(m) - 1]
}

// ─── Sub-aba: Verificação de Declarações ──────────────────────────────────────
function AbaVerificacao({ data, ano }: { data: any; ano: number }) {
  const nowMonth = new Date().toISOString().slice(0, 7)

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Cobertura Geral"
          value={`${data.cobertura_geral_pct}%`}
          icon={TrendingUp}
          color={data.cobertura_geral_pct >= 90 ? 'green' : data.cobertura_geral_pct >= 60 ? 'amber' : 'red'}
          subtitle={`${ano} — meses até hoje`}
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
                {data.meses.map((m: string) => {
                  const idx = parseInt(m.split('-')[1]) - 1
                  return (
                    <th key={m} className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[50px]">
                      {MONTH_NAMES[idx]}
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[70px]">%</th>
              </tr>
            </thead>
            <tbody>
              {data.clientes.map((cliente: MensalClienteItem) => (
                <tr key={cliente.client_id} className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-dark-900">
                    <div className="font-medium text-dark-200 truncate max-w-[190px]">{cliente.nome}</div>
                    <div className="text-dark-500 text-[10px]">{cliente.cnpj}</div>
                  </td>
                  {data.meses.map((m: string) => {
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
  )
}

// ─── Sub-aba: Evolução do Imposto ─────────────────────────────────────────────
function AbaEvolucao({ data }: { data: any }) {
  const clientes: MensalClienteItem[] = data.clientes.filter(
    (c: MensalClienteItem) => c.mes_atual && c.mes_anterior
  )

  if (clientes.length === 0) {
    return (
      <div className="card p-8 text-center text-dark-500">
        Nenhum cliente com dois meses consecutivos de declaração para comparar.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legenda de alertas */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-dark-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/50 inline-block" />
          Variação de alíquota &gt; 1 ponto percentual
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/50 inline-block" />
          Faturamento aumentou mais de 10%
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="px-4 py-3 text-left text-dark-400 font-medium uppercase tracking-wider sticky left-0 bg-dark-900 min-w-[200px]">
                  Cliente
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[100px]">
                  Fat. Anterior
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[100px]">
                  Fat. Atual
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[80px]">
                  Var. Fat.
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[90px]">
                  Alíq. Anterior
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[90px]">
                  Alíq. Atual
                </th>
                <th className="px-3 py-3 text-center text-dark-400 font-medium uppercase tracking-wider min-w-[80px]">
                  Var. Alíq.
                </th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const alertaAliq = Math.abs(cliente.variacao_aliquota_pct ?? 0) > 1
                const alertaFat = (cliente.variacao_faturamento_pct ?? 0) > 10

                return (
                  <tr
                    key={cliente.client_id}
                    className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                  >
                    {/* Nome */}
                    <td className="px-4 py-2.5 sticky left-0 bg-dark-900">
                      <div className="font-medium text-dark-200 truncate max-w-[190px]">{cliente.nome}</div>
                      <div className="text-dark-500 text-[10px]">
                        {MesLabel(cliente.mes_anterior)} → {MesLabel(cliente.mes_atual)}
                      </div>
                    </td>

                    {/* Faturamento anterior */}
                    <td className="px-3 py-2.5 text-center text-dark-300">
                      {cliente.faturamento_anterior != null ? BRL(cliente.faturamento_anterior) : '—'}
                    </td>

                    {/* Faturamento atual */}
                    <td className={clsx(
                      'px-3 py-2.5 text-center font-medium',
                      alertaFat ? 'text-blue-300 bg-blue-500/10' : 'text-dark-200'
                    )}>
                      {cliente.faturamento_atual != null ? BRL(cliente.faturamento_atual) : '—'}
                    </td>

                    {/* Variação faturamento */}
                    <td className={clsx(
                      'px-3 py-2.5 text-center font-semibold',
                      alertaFat ? 'text-blue-400' :
                      (cliente.variacao_faturamento_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {cliente.variacao_faturamento_pct != null ? (
                        <span className="flex items-center justify-center gap-1">
                          {(cliente.variacao_faturamento_pct >= 0)
                            ? <TrendingUp size={12} />
                            : <TrendingDown size={12} />}
                          {cliente.variacao_faturamento_pct > 0 ? '+' : ''}{cliente.variacao_faturamento_pct.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>

                    {/* Alíquota anterior */}
                    <td className="px-3 py-2.5 text-center text-dark-300">
                      {cliente.aliquota_anterior != null ? PCT(cliente.aliquota_anterior) : '—'}
                    </td>

                    {/* Alíquota atual */}
                    <td className={clsx(
                      'px-3 py-2.5 text-center font-medium',
                      alertaAliq ? 'text-amber-300 bg-amber-500/10' : 'text-dark-200'
                    )}>
                      {cliente.aliquota_atual != null ? PCT(cliente.aliquota_atual) : '—'}
                    </td>

                    {/* Variação alíquota */}
                    <td className={clsx(
                      'px-3 py-2.5 text-center font-semibold',
                      alertaAliq ? 'text-amber-400' :
                      (cliente.variacao_aliquota_pct ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                    )}>
                      {cliente.variacao_aliquota_pct != null ? (
                        `${cliente.variacao_aliquota_pct > 0 ? '+' : ''}${cliente.variacao_aliquota_pct.toFixed(2)} pp`
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TabMensal() {
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState(currentYear)
  const [subAba, setSubAba] = useState<'verificacao' | 'evolucao'>('verificacao')
  const { data, isLoading } = useDashboardMensal(ano)

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* Filtro de ano + sub-abas */}
      <div className="card p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
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

        {/* Sub-abas */}
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          <button
            onClick={() => setSubAba('verificacao')}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              subAba === 'verificacao'
                ? 'bg-dark-700 text-dark-100 shadow'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            Verificação
          </button>
          <button
            onClick={() => setSubAba('evolucao')}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              subAba === 'evolucao'
                ? 'bg-dark-700 text-dark-100 shadow'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            Evolução do Imposto
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64 text-dark-400">Carregando...</div>
      )}

      {data && subAba === 'verificacao' && <AbaVerificacao data={data} ano={ano} />}
      {data && subAba === 'evolucao' && <AbaEvolucao data={data} />}
    </div>
  )
}
