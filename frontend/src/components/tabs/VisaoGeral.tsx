import { useState } from 'react'
import { FileText, Users, TrendingUp, DollarSign, Percent, Calendar, RefreshCw, ChevronDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import StatCard from '../dashboard/StatCard'
import { useDashboardGeral } from '../../hooks'
import type { EvolucaoMensalItem } from '../../types'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => `${v.toFixed(2)}%`

const TRIBUTO_COLORS: Record<string, string> = {
  irpj: '#6366f1', csll: '#8b5cf6', cofins: '#ec4899',
  pis: '#f59e0b', cpp: '#D4AF37', icms: '#22c55e', iss: '#3b82f6',
}

const formatComp = (c: string) => {
  const [y, m] = c.split('-')
  return `${m}/${y.slice(2)}`
}

function buildKpisFromItem(item: EvolucaoMensalItem) {
  return {
    total_declaracoes: item.qtd_declaracoes,
    receita_bruta_total: item.receita_bruta,
    tributos_total: item.tributos,
    aliquota_media: item.receita_bruta > 0 ? (item.tributos / item.receita_bruta) * 100 : 0,
    irpj_total: item.irpj,
    csll_total: item.csll,
    cofins_total: item.cofins,
    pis_total: item.pis,
    cpp_total: item.cpp,
    icms_total: item.icms,
    ipi_total: item.ipi,
    iss_total: item.iss,
  }
}

export default function VisaoGeral() {
  const { data, isLoading, error } = useDashboardGeral()
  const [competencia, setCompetencia] = useState<string>('') // '' = todas

  if (isLoading) return <div className="flex items-center justify-center h-64 text-dark-400">Carregando...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">Erro ao carregar dados.</div>
  if (!data) return null

  const { kpis: kpisGeral, evolucao_mensal } = data

  // KPIs para o período selecionado (ou totais gerais)
  const itemSelecionado = competencia
    ? evolucao_mensal.find(e => e.competencia === competencia)
    : null

  const kpis = itemSelecionado ? buildKpisFromItem(itemSelecionado) : kpisGeral

  const pieData = [
    { name: 'IRPJ',   value: kpis.irpj_total },
    { name: 'CSLL',   value: kpis.csll_total },
    { name: 'COFINS', value: kpis.cofins_total },
    { name: 'PIS',    value: kpis.pis_total },
    { name: 'CPP',    value: kpis.cpp_total },
    { name: 'ICMS',   value: kpis.icms_total },
    { name: 'ISS',    value: kpis.iss_total },
  ].filter(d => d.value > 0)

  const pieColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#D4AF37', '#22c55e', '#3b82f6']

  return (
    <div className="space-y-6">

      {/* Filtro de competência */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <label className="text-dark-400 text-sm font-medium whitespace-nowrap">Competência:</label>

        <div className="relative">
          <select
            className="select pr-8 appearance-none"
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
          >
            <option value="">Todas as competências</option>
            {[...evolucao_mensal].reverse().map(e => (
              <option key={e.competencia} value={e.competencia}>
                {formatComp(e.competencia)} — {e.qtd_declaracoes} declarações
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-dark-400" />
        </div>

        {competencia && (
          <button
            onClick={() => setCompetencia('')}
            className="text-xs text-dark-500 hover:text-dark-300 underline transition-colors"
          >
            Limpar filtro
          </button>
        )}

        {/* Sync info */}
        {kpisGeral.ultima_sync && (
          <div className="ml-auto flex items-center gap-2 text-dark-500 text-xs">
            <RefreshCw size={11} />
            Última sync: {new Date(kpisGeral.ultima_sync).toLocaleString('pt-BR')}
            {kpisGeral.novos_arquivos_ultima_sync > 0 && (
              <span className="badge-ok ml-1">{kpisGeral.novos_arquivos_ultima_sync} novo(s)</span>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Declarações"
          value={kpis.total_declaracoes}
          icon={FileText}
          color="gold"
          subtitle={competencia ? formatComp(competencia) : 'Todos os períodos'}
        />
        {!competencia && (
          <StatCard title="Clientes" value={kpisGeral.total_clientes} icon={Users} color="blue" />
        )}
        {!competencia && (
          <StatCard title="Competências" value={kpisGeral.competencias_cobertas} icon={Calendar} color="green" />
        )}
        {competencia && (
          <StatCard
            title="Alíq. Mínima"
            value={PCT(Math.min(...evolucao_mensal.filter(e => e.receita_bruta > 0).map(e => (e.tributos / e.receita_bruta) * 100)))}
            icon={Percent}
            color="green"
            subtitle="No período geral"
          />
        )}
        {competencia && (
          <StatCard
            title="Alíq. Máxima"
            value={PCT(Math.max(...evolucao_mensal.filter(e => e.receita_bruta > 0).map(e => (e.tributos / e.receita_bruta) * 100)))}
            icon={Percent}
            color="amber"
            subtitle="No período geral"
          />
        )}
        <StatCard
          title="Receita Total"
          value={BRL(kpis.receita_bruta_total)}
          icon={TrendingUp}
          color="gold"
          subtitle={competencia ? formatComp(competencia) : 'Soma de todos os períodos'}
        />
        <StatCard
          title="Tributos Total"
          value={BRL(kpis.tributos_total)}
          icon={DollarSign}
          color="amber"
          subtitle={competencia ? formatComp(competencia) : undefined}
        />
        <StatCard
          title="Alíquota Média"
          value={PCT(competencia
            ? (kpis.receita_bruta_total > 0 ? (kpis.tributos_total / kpis.receita_bruta_total) * 100 : 0)
            : kpisGeral.aliquota_media
          )}
          icon={Percent}
          color="green"
          subtitle={competencia ? formatComp(competencia) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Evolução Receita — sempre mostra tudo, destaca mês selecionado */}
        <div className="xl:col-span-2 card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-4">
            Evolução da Receita Bruta
            {competencia && <span className="ml-2 text-gold-400 font-normal text-xs">↑ {formatComp(competencia)} em destaque</span>}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucao_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => BRL(v)}
                labelFormatter={formatComp}
                contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
              />
              {competencia && (
                <ReferenceLine x={competencia} stroke="#D4AF37" strokeDasharray="4 2" strokeWidth={1.5} />
              )}
              <Line type="monotone" dataKey="receita_bruta" stroke="#D4AF37" strokeWidth={2}
                dot={(props: any) => {
                  const isSelected = props.payload?.competencia === competencia
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={isSelected ? 6 : 3}
                    fill={isSelected ? '#D4AF37' : '#D4AF37'} stroke={isSelected ? '#fff' : 'none'} strokeWidth={2} />
                }}
                name="Receita Bruta" />
              <Line type="monotone" dataKey="tributos" stroke="#C9A84C" strokeWidth={2} strokeDasharray="4 2"
                dot={(props: any) => {
                  const isSelected = props.payload?.competencia === competencia
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={isSelected ? 5 : 2}
                    fill="#C9A84C" stroke={isSelected ? '#fff' : 'none'} strokeWidth={2} />
                }}
                name="Tributos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição tributos (pizza) — filtra por competência */}
        <div className="card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-1">Distribuição de Tributos</h3>
          <p className="text-dark-500 text-xs mb-3">
            {competencia ? formatComp(competencia) : 'Acumulado geral'}
          </p>
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

      {/* Tributos por mês (barras empilhadas) — sempre mostra tudo */}
      {evolucao_mensal.length > 0 && (
        <div className="card p-5">
          <h3 className="text-dark-200 font-semibold text-sm mb-4">
            Tributos por Competência
            {competencia && <span className="ml-2 text-gold-400 font-normal text-xs">↑ {formatComp(competencia)} em destaque</span>}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucao_mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
              <Tooltip formatter={(v: number) => BRL(v)} labelFormatter={formatComp}
                contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#737373' }} />
              {competencia && (
                <ReferenceLine x={competencia} stroke="#D4AF37" strokeDasharray="4 2" strokeWidth={1.5} />
              )}
              {Object.entries(TRIBUTO_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} stackId="trib" fill={color}
                  name={key.toUpperCase()}
                  opacity={competencia ? (1) : 1}
                  stroke={undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela detalhada da competência selecionada */}
      {itemSelecionado && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="text-dark-200 font-semibold text-sm">
              Detalhamento — {formatComp(itemSelecionado.competencia)}
            </h3>
            <span className="text-dark-500 text-xs">{itemSelecionado.qtd_declaracoes} declarações</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-700 text-dark-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Tributo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">% do DAS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'IRPJ',   key: 'irpj',   color: '#6366f1' },
                  { label: 'CSLL',   key: 'csll',   color: '#8b5cf6' },
                  { label: 'COFINS', key: 'cofins', color: '#ec4899' },
                  { label: 'PIS',    key: 'pis',    color: '#f59e0b' },
                  { label: 'CPP',    key: 'cpp',    color: '#D4AF37' },
                  { label: 'ICMS',   key: 'icms',   color: '#22c55e' },
                  { label: 'IPI',    key: 'ipi',    color: '#a3a3a3' },
                  { label: 'ISS',    key: 'iss',    color: '#3b82f6' },
                ].filter(t => (itemSelecionado as any)[t.key] > 0).map(t => {
                  const val = (itemSelecionado as any)[t.key] as number
                  const pct = itemSelecionado.tributos > 0 ? (val / itemSelecionado.tributos) * 100 : 0
                  return (
                    <tr key={t.key} className="border-b border-dark-800 hover:bg-dark-800/40 transition-colors">
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color }} />
                        <span className="text-dark-200 font-medium">{t.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-dark-200">{BRL(val)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{pct.toFixed(1)}%</td>
                    </tr>
                  )
                })}
                <tr className="border-t border-dark-600 bg-dark-800/30">
                  <td className="px-4 py-3 text-dark-200 font-semibold">Total DAS</td>
                  <td className="px-4 py-3 text-right text-gold-400 font-bold">{BRL(itemSelecionado.tributos)}</td>
                  <td className="px-4 py-3 text-right text-dark-400">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
