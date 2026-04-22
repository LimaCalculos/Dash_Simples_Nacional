import { useState } from 'react'
import { TrendingUp, DollarSign, Percent, Calendar, AlertTriangle, MapPin, FileDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import StatCard from '../dashboard/StatCard'
import { useClients, useDashboardCliente } from '../../hooks'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PCT = (v: number) => `${v.toFixed(2)}%`
const formatComp = (c: string) => { const [y, m] = c.split('-'); return `${m}/${y.slice(2)}` }

function gerarPDF(data: any, clienteNome: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const pageW = doc.internal.pageSize.getWidth()

  // Cabeçalho
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(212, 175, 55) // gold
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Lima Cálculos', 14, 13)
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('Simples Nacional — Relatório por Cliente', 14, 20)
  doc.text(`Emitido em: ${now}`, pageW - 14, 20, { align: 'right' })

  // Nome e CNPJ do cliente
  doc.setTextColor(30, 30, 30)
  doc.setFillColor(245, 245, 240)
  doc.rect(0, 30, pageW, 18, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(clienteNome, 14, 41)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`CNPJ: ${data.cnpj}${data.municipio ? `   |   ${data.municipio}/${data.uf}` : ''}`, 14, 46)

  // KPIs em caixas
  const kpis = [
    { label: 'Competências Declaradas', value: String(data.competencias_declaradas) },
    { label: 'Receita Total', value: BRL(data.receita_total) },
    { label: 'Tributos Total', value: BRL(data.tributos_total) },
    { label: 'Alíquota Média', value: PCT(data.aliquota_media) },
  ]
  const colW = (pageW - 28) / 4
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (colW + 2)
    doc.setFillColor(248, 248, 248)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(x, 55, colW, 18, 2, 2, 'FD')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(kpi.label, x + colW / 2, 61, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(kpi.value, x + colW / 2, 69, { align: 'center' })
  })

  // Alerta sublimite
  let yPos = 82
  if (data.alerta_sublimite) {
    doc.setFillColor(255, 243, 205)
    doc.setDrawColor(255, 193, 7)
    doc.roundedRect(14, yPos, pageW - 28, 10, 2, 2, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(133, 77, 14)
    doc.text(`⚠ Atenção ao sublimite! RBT12: ${BRL(data.rbt12_atual)} — acima de 80% do limite anual`, 18, yPos + 6.5)
    yPos += 16
  }

  // Título da tabela
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Histórico de Declarações', 14, yPos + 6)
  yPos += 10

  // Tabela histórico
  autoTable(doc, {
    startY: yPos,
    head: [['Competência', 'Receita Bruta', 'Tributos', 'Alíquota']],
    body: data.evolucao.map((row: any) => [
      formatComp(row.competencia),
      BRL(row.receita_bruta),
      BRL(row.tributos),
      PCT(row.receita_bruta > 0 ? (row.tributos / row.receita_bruta) * 100 : 0),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [10, 10, 10], textColor: [212, 175, 55], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  })

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Lima Cálculos — Gerado automaticamente pelo sistema Simples Dashboard`, 14, 290)
    doc.text(`Página ${i}/${totalPages}`, pageW - 14, 290, { align: 'right' })
  }

  // Salvar
  const nomeArquivo = `relatorio-${clienteNome.replace(/\s+/g, '_').toLowerCase()}-${now.replace(/\//g, '-')}.pdf`
  doc.save(nomeArquivo)
}

export default function PorCliente() {
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [gerando, setGerando] = useState(false)
  const { data: clients } = useClients()
  const { data, isLoading } = useDashboardCliente(selectedId)

  const clienteSelecionado = clients?.find(c => c.id === selectedId)

  const handleGerarPDF = () => {
    if (!data || !clienteSelecionado) return
    setGerando(true)
    setTimeout(() => {
      gerarPDF(data, clienteSelecionado.nome)
      setGerando(false)
    }, 100)
  }

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
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
          <div className="flex items-center gap-1 text-dark-500 text-xs">
            <MapPin size={12} />
            {data.municipio}/{data.uf}
          </div>
        )}

        {/* Botão PDF */}
        {data && (
          <button
            onClick={handleGerarPDF}
            disabled={gerando}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 text-sm font-medium transition-all disabled:opacity-50"
          >
            <FileDown size={15} />
            {gerando ? 'Gerando...' : 'Exportar PDF'}
          </button>
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

            {/* Tributos total por competência (simplificado) */}
            <div className="card p-5">
              <h3 className="text-dark-200 font-semibold text-sm mb-1">Tributos por Competência</h3>
              <p className="text-dark-500 text-xs mb-4">DAS unificado do Simples Nacional</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="competencia" tickFormatter={formatComp} tick={{ fill: '#737373', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#737373', fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [BRL(v), 'DAS Simples']}
                    labelFormatter={formatComp}
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="tributos" fill="#D4AF37" radius={[3, 3, 0, 0]} name="DAS Simples" />
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
                    <th className="px-4 py-3 text-right">Tributos (DAS)</th>
                    <th className="px-4 py-3 text-right">Alíquota</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evolucao.map(row => (
                    <tr key={row.competencia} className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors">
                      <td className="px-4 py-2.5 text-gold-400 font-medium">{formatComp(row.competencia)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-200">{BRL(row.receita_bruta)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400 font-semibold">{BRL(row.tributos)}</td>
                      <td className="px-4 py-2.5 text-right text-dark-300">
                        {row.receita_bruta > 0 ? PCT((row.tributos / row.receita_bruta) * 100) : '—'}
                      </td>
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
