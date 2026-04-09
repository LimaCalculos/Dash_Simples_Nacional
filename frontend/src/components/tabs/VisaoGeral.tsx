import { FileText, Users, TrendingUp, DollarSign, Percent, Calendar, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import StatCard from '../dashboard/StatCard'
import { useDashboardGeral } from '../../hooks'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => `${v.toFixed(2)}%`

const TRIBUTO_COLORS: Record<string, string> = {
  irpj: '#6366f1', csll: '#8b5cf6', cofins: '#ec4899',
  pis: '#f59e0b', cpp: '#D4AF37', icms: '#22c55e', iss: '#3b82f6',
}

export default function VisaoGeral() {
  const { data, isLoading, error } = useDashboardGeral()

  if (isLoading) return <div className="flex items-center justify-center h-64 text-dark-400">Carregando...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">Erro ao carregar dados.</div>
  if (!data) return null

  const { kpis, evolucao_mensal } = data

  const pieData = [
    { name: 'IRPJ', value: kpis.irpj_total },
    { name: 'CSLL', value: kpis.csll_total },
    { name: 'COFINS', value: kpis.cofins_total },
    { name: 'PIS', value: kpis.pis_total },
    { name: 'CPP', value: kpis.cpp_total },
    { name: 'ICMS', value: kpis.icms_total },
    { name: 'ISS', value: kpis.iss_total },
  ].filter(d => d.value > 0)

  const pieColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#D4AF37', '#22c55e', '#3b82f6']

  const formatComp = (c: string) => {
    const [y, m] = c.split('-')
    return `${m}/${y.slice(2)}`
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Declarações" value={kpis.total_declaracoes} icon={FileText} color="gold" />
        <StatCard title="Clientes" value={kpis.total_clientes} icon={Users} color="blue" />
        <StatCard title="Competências" value={kpis.competencias_cobertas} icon={Calendar} color="green" />
        <StatCard title="Receita Total" value={BRL(kpis.receita_bruta_total)} icon={TrendingUp} color="gold"
          subtitle="Soma de todos os períodos" />
        <StatCard title="Tributos Total" value={BRL(kpis.tributos_total)} icon={DollarSign} color="amber" />
        <StatCard title="Alíquota Média" value={PCT(kpis.aliquota_media)} icon={Percent} color="green" />
      </div>

      {/* Sync info */}
      {kpis.ultima_sync && (
        <div className="flex items-center gap-2 text-dark-500 text-xs">
          <RefreshCw size={11} />
          Última sincronização: {new Date(kpis.ultima_sync).toLocaleString('pt-BR')}
          {kpis.novos_arquivos_ultima_sync > 0 && (
            <span className="badge-ok ml-1">{kpis.novos_arquivos_ultima_sync} novo(s)</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Evolução Receita */}
        <div className="xl:col-span-2 card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-4">Evolução da Receita Bruta</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucao_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => BRL(v)}
                labelFormatter={formatComp}
                contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="receita_bruta" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, fill: '#D4AF37' }} name="Receita Bruta" />
              <Line type="monotone" dataKey="tributos" stroke="#C9A84C" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} name="Tributos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição tributos (pizza) */}
        <div className="card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-4">Distribuição de Tributos</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => BRL(v)}
                  contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#737373' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-dark-500 text-sm">Sem dados</div>
          )}
        </div>
      </div>

      {/* Tributos por mês (barras empilhadas) */}
      {evolucao_mensal.length > 0 && (
        <div className="card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-4">Tributos por Competência</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucao_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => BRL(v)} labelFormatter={formatComp}
                contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#737373' }} />
              {Object.entries(TRIBUTO_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="trib" fill={color} name={key.toUpperCase()} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
