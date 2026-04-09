import { useState } from 'react'
import { TrendingUp, DollarSign, Percent, Calendar, AlertTriangle, MapPin } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import StatCard from '../dashboard/StatCard'
import { useClients, useDashboardCliente } from '../../hooks'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => `${v.toFixed(2)}%`
const formatComp = (c: string) => { const [y, m] = c.split('-'); return `${m}/${y.slice(2)}` }

export default function PorCliente() {
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const { data: clients } = useClients()
  const { data, isLoading } = useDashboardCliente(selectedId)

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-dark-400 text-sm font-medium whitespace-nowrap">Selecionar cliente:</label>
        <select
          className="select flex-1 max-w-md"
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">— Escolha um cliente —</option>
          {clients?.map(c => (
            <option key={c.id} value={c.id}>{c.nome} — {c.cnpj}</option>
          ))}
        </select>
        {data?.municipio && (
          <div className="flex items-center gap-1 text-dark-500 text-xs ml-auto">
            <MapPin size={12} />
            {data.municipio}/{data.uf}
          </div>
        )}
      </div>

      {!selectedId && (
        <div className="flex items-center justify-center h-64 text-dark-500 text-sm">
          Selecione um cliente para ver os detalhes.
        </div>
      )}

      {selectedId && isLoading && (
        <div className="flex items-center justify-center h-64 text-dark-400">Carregando...</div>
      )}

      {data && (
        <>
          {/* Sublimite alert */}
          {data.alerta_sublimite && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-400 text-sm">
              <AlertTriangle size={18} />
              <div>
                <strong>Atenção ao sublimite!</strong> RBT12 de {BRL(data.rbt12_atual)} está acima de 80% do limite
                anual do Simples Nacional (R$ 4.800.000,00).
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Competências" value={data.competencias_declaradas} icon={Calendar} color="gold" />
            <StatCard title="Receita Total" value={BRL(data.receita_total)} icon={TrendingUp} color="gold" />
            <StatCard title="Tributos Total" value={BRL(data.tributos_total)} icon={DollarSign} color="amber" />
            <StatCard title="Alíquota Média" value={PCT(data.aliquota_media)} icon={Percent} color="green"
              alert={data.alerta_sublimite} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Receita bruta do cliente */}
            <div className="card p-5">
              <h3 className="text-dark-200 font-semibold text-sm mb-4">Receita Bruta por Competência</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => BRL(v)} labelFormatter={formatComp}
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="receita_bruta" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} name="Receita Bruta" />
                  <Line type="monotone" dataKey="tributos" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Tributos" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tributos por competência */}
            <div className="card p-5">
              <h3 className="text-dark-200 font-semibold text-sm mb-4">Tributos por Competência</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `R$${v.toFixed(0)}`} tick={{ fill: '#737373', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => BRL(v)} labelFormatter={formatComp}
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: '#737373' }} />
                  <Bar dataKey="irpj" stackId="t" fill="#6366f1" name="IRPJ" />
                  <Bar dataKey="csll" stackId="t" fill="#8b5cf6" name="CSLL" />
                  <Bar dataKey="cofins" stackId="t" fill="#ec4899" name="COFINS" />
                  <Bar dataKey="pis" stackId="t" fill="#f59e0b" name="PIS" />
                  <Bar dataKey="cpp" stackId="t" fill="#D4AF37" name="CPP" />
                  <Bar dataKey="icms" stackId="t" fill="#22c55e" name="ICMS" />
                  <Bar dataKey="iss" stackId="t" fill="#3b82f6" name="ISS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Histórico tabela */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <h3 className="text-dark-200 font-semibold text-sm">Histórico de Declarações</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-dark-700 text-dark-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Competência</th>
                    <th className="px-4 py-3 text-right">Receita Bruta</th>
                    <th className="px-4 py-3 text-right">IRPJ</th>
                    <th className="px-4 py-3 text-right">CSLL</th>
                    <th className="px-4 py-3 text-right">COFINS</th>
                    <th className="px-4 py-3 text-right">PIS</th>
                    <th className="px-4 py-3 text-right">CPP</th>
                    <th className="px-4 py-3 text-right">ISS</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evolucao.map(row => (
                    <tr key={row.competencia} className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors">
                      <td className="px-4 py-2.5 text-gold-400 font-medium">{formatComp(row.competencia)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-200">{BRL(row.receita_bruta)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.irpj)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.csll)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.cofins)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.pis)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.cpp)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-400">{BRL(row.iss)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">{BRL(row.tributos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
