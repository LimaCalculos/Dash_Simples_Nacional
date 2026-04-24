import { useState, useEffect } from 'react'
import { Building2, FileCheck, ChevronRight, RefreshCw, Trash2, Save, Search } from 'lucide-react'
import api from '../api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CredsStatus { configured: boolean; cnpj_contador: string | null }

interface ProcResult {
  cnpjContribuinte: string; cnpjContador: string
  ativa: boolean; dtExpiracao: string | null; sistemas: string[]
}

interface DasInfo {
  numeroDas: string; dataEmissao: string; pago: boolean; tipoOperacao: string
}

interface Periodo {
  periodoApuracao: number
  declaracoes: { numeroDeclaracao: string; dataHoraTransmissao: string; tipoOperacao: string }[]
  das:      DasInfo | null
  valorDas: string | null
}

interface DecResult { cnpj: string; anoCalendario: number; periodos: Periodo[] }

type Tab = 'config' | 'procuracao' | 'declaracoes'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g,'').slice(0,14)
  if (d.length<=2)  return d
  if (d.length<=5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length<=8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length<=12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function fmtDtExp(s: string | null) {
  if (!s || s.length < 8) return s ?? '—'
  return `${s.slice(6,8)}/${s.slice(4,6)}/${s.slice(0,4)}`
}

function isDasVencido(periodoApuracao: number) {
  const s   = String(periodoApuracao)
  const ano = parseInt(s.slice(0,4)), mes = parseInt(s.slice(4,6))
  const vM  = mes===12 ? 1 : mes+1, vA = mes===12 ? ano+1 : ano
  return new Date() > new Date(vA, vM-1, 20)
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SerproPage() {
  const [tab, setTab]       = useState<Tab>('config')
  const [saving, setSaving] = useState(false)
  const [querying, setQ]    = useState(false)
  const [alert, setAlert]   = useState<{ msg: string; type: 'ok'|'err'|'warn' } | null>(null)

  const [credStatus, setCredStatus] = useState<CredsStatus | null>(null)
  const [key, setKey]               = useState('')
  const [secret, setSecret]         = useState('')
  const [cnpjContador, setCnpjCont] = useState('')

  const [procCnpj, setProcCnpj]   = useState('')
  const [procResult, setProcResult] = useState<ProcResult | null>(null)

  const [decCnpj, setDecCnpj]   = useState('')
  const [decAno, setDecAno]     = useState(String(new Date().getFullYear()))
  const [decResult, setDecResult] = useState<DecResult | null>(null)

  function showAlert(msg: string, type: 'ok'|'err'|'warn' = 'ok') {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 5000)
  }

  // Load creds status
  useEffect(() => {
    api.get('/api/serpro/credenciais/status')
      .then(r => setCredStatus(r.data))
      .catch(() => {})
  }, [])

  // ── Save credentials ──────────────────────────────────────────────────────

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/api/serpro/credenciais', {
        consumer_key:    key.trim(),
        consumer_secret: secret.trim(),
        cnpj_contador:   cnpjContador.replace(/\D/g,'') || null,
      })
      setKey(''); setSecret('')
      const r = await api.get('/api/serpro/credenciais/status')
      setCredStatus(r.data)
      showAlert('Credenciais salvas com sucesso!')
    } catch (err: any) {
      showAlert(err.response?.data?.detail || err.message, 'err')
    } finally { setSaving(false) }
  }

  async function handleDeleteCreds() {
    if (!confirm('Remover as credenciais Serpro? As consultas deixarão de funcionar.')) return
    await api.delete('/api/serpro/credenciais')
    const r = await api.get('/api/serpro/credenciais/status')
    setCredStatus(r.data)
    showAlert('Credenciais removidas.', 'warn')
  }

  // ── Procuração ────────────────────────────────────────────────────────────

  async function handleProcuracao(e: React.FormEvent) {
    e.preventDefault(); setQ(true); setProcResult(null)
    try {
      const r = await api.post('/api/serpro/procuracao', { cnpj: procCnpj.replace(/\D/g,'') })
      setProcResult(r.data.data)
    } catch (err: any) {
      showAlert(err.response?.data?.detail || err.message, 'err')
    } finally { setQ(false) }
  }

  // ── Declarações ───────────────────────────────────────────────────────────

  async function handleDeclaracoes(e: React.FormEvent) {
    e.preventDefault(); setQ(true); setDecResult(null)
    try {
      const r = await api.post('/api/serpro/declaracoes', {
        cnpj: decCnpj.replace(/\D/g,''), anoCalendario: Number(decAno)
      })
      setDecResult(r.data.data)
    } catch (err: any) {
      showAlert(err.response?.data?.detail || err.message, 'err')
    } finally { setQ(false) }
  }

  const notConfigured = !credStatus?.configured

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Consulta Serpro</h1>
          <p className="text-dark-400 text-sm mt-1">
            Integra Contador · Procuração e-CAC · Declarações PGDAS-D
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
          credStatus?.configured
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-gold-500/10 text-gold-400 border-gold-500/30'
        }`}>
          {credStatus?.configured ? '✓ Credenciais configuradas' : '⚠ Sem credenciais'}
        </span>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${
          alert.type==='ok'   ? 'bg-green-500/10 text-green-400 border-green-500/30' :
          alert.type==='err'  ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                'bg-gold-500/10 text-gold-400 border-gold-500/30'
        }`}>
          {alert.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key:'config',      icon:'🔑', label:'Credenciais'      },
          { key:'procuracao',  icon:'📜', label:'Procuração e-CAC' },
          { key:'declaracoes', icon:'📋', label:'Declarações / DAS' },
        ] as { key:Tab; icon:string; label:string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              tab===t.key
                ? 'bg-gold-500/10 text-gold-400 border-gold-500/30 shadow-sm'
                : 'text-dark-400 border-dark-800 bg-dark-900 hover:text-dark-200 hover:border-dark-700'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── CONFIG TAB ────────────────────────────────────────────────────── */}
      {tab==='config' && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Credenciais Serpro</h2>
            <p className="text-dark-400 text-sm mt-1">Autenticação OAuth2 com certificado e-CNPJ (mTLS).</p>
          </div>

          {/* Steps */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Como obter as credenciais</p>
            {[
              <>Acesse <a href="https://loja.serpro.gov.br" target="_blank" rel="noopener" className="text-blue-400 underline">loja.serpro.gov.br</a> e contrate o <strong>Integra Contador</strong>.</>,
              <>Faça login com seu <strong>e-CNPJ</strong> na Área do Cliente.</>,
              <>Acesse <a href="https://cliente.serpro.gov.br" target="_blank" rel="noopener" className="text-blue-400 underline">cliente.serpro.gov.br</a> → Meus Serviços → Integra Contador → <strong>Chaves de Acesso</strong>.</>,
              <>Copie o <strong>Consumer Key</strong> e <strong>Consumer Secret</strong> e cole abaixo.</>,
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-dark-950 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                <span className="text-sm text-dark-300">{text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveCreds} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Consumer Key</label>
              <input className="input" type="password" value={key} onChange={e=>setKey(e.target.value)}
                placeholder={credStatus?.configured ? '•••••• (já configurada)' : 'Cole a Consumer Key'} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Consumer Secret</label>
              <input className="input" type="password" value={secret} onChange={e=>setSecret(e.target.value)}
                placeholder={credStatus?.configured ? '•••••• (já configurado)' : 'Cole o Consumer Secret'} required />
              <p className="text-dark-600 text-xs mt-1.5">Armazenados no banco de dados do servidor.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">CNPJ do Escritório (opcional)</label>
              <input className="input" type="text" value={cnpjContador}
                onChange={e => setCnpjCont(fmtCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00" maxLength={18} />
              <p className="text-dark-600 text-xs mt-1.5">Se não preenchido, usa 30.226.273/0001-10.</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {credStatus?.configured && (
                <button type="button" onClick={handleDeleteCreds}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                  <Trash2 size={14} /> Remover
                </button>
              )}
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Salvando...' : 'Salvar Credenciais'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── PROCURAÇÃO TAB ────────────────────────────────────────────────── */}
      {tab==='procuracao' && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Verificar Procuração e-CAC</h2>
            <p className="text-dark-400 text-sm mt-1">
              Verifica se o contribuinte outorgou procuração ao escritório.
              Serviço: <code className="text-blue-400 bg-dark-900 px-1.5 py-0.5 rounded text-xs">OBTERPROCURACAO41</code>
            </p>
          </div>

          {notConfigured && <NotConfiguredWarning />}

          <form onSubmit={handleProcuracao} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">CNPJ do Contribuinte</label>
              <input className="input" value={procCnpj} onChange={e=>setProcCnpj(fmtCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00" maxLength={18} required />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={querying || notConfigured} className="btn-primary flex items-center gap-2">
                {querying ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                {querying ? 'Consultando...' : 'Verificar Procuração'}
              </button>
            </div>
          </form>

          {procResult && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-sm font-bold text-white">Resultado da Consulta</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  procResult.ativa
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {procResult.ativa ? '✓ Procuração ATIVA' : '✕ Sem procuração ativa'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <ResultItem label="CNPJ Contribuinte" value={fmtCNPJ(procResult.cnpjContribuinte)} />
                <ResultItem label="CNPJ Contador"     value={fmtCNPJ(procResult.cnpjContador)} />
                {procResult.dtExpiracao && (
                  <ResultItem label="Expiração" value={fmtDtExp(procResult.dtExpiracao)}
                    highlight={procResult.ativa ? 'text-green-400' : 'text-red-400'} />
                )}
              </div>
              {!procResult.ativa && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                  Oriente o cliente a acessar <strong>eCAC</strong> (cav.receita.fazenda.gov.br) → Delegar Acesso → e conceder procuração ao escritório.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DECLARAÇÕES TAB ───────────────────────────────────────────────── */}
      {tab==='declaracoes' && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Declarações PGDAS-D</h2>
            <p className="text-dark-400 text-sm mt-1">
              Lista declarações do ano com valor do DAS em aberto.
              Serviços: <code className="text-blue-400 bg-dark-900 px-1.5 py-0.5 rounded text-xs">CONSDECLARACAO13</code> + <code className="text-blue-400 bg-dark-900 px-1.5 py-0.5 rounded text-xs">CONSEXTRATO16</code>
            </p>
          </div>

          {notConfigured && <NotConfiguredWarning />}

          <form onSubmit={handleDeclaracoes} className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">CNPJ do Contribuinte</label>
                <input className="input" value={decCnpj} onChange={e=>setDecCnpj(fmtCNPJ(e.target.value))}
                  placeholder="00.000.000/0001-00" maxLength={18} required />
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Ano</label>
                <input className="input" type="number" value={decAno} onChange={e=>setDecAno(e.target.value)}
                  min={2012} max={new Date().getFullYear()} required />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={querying || notConfigured} className="btn-primary flex items-center gap-2">
                {querying ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                {querying ? 'Consultando...' : 'Consultar Declarações'}
              </button>
            </div>
          </form>

          {decResult && <DeclaracoesList data={decResult} />}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NotConfiguredWarning() {
  return (
    <div className="flex gap-2 items-start bg-gold-500/10 border border-gold-500/30 rounded-xl px-4 py-3 text-sm text-gold-300">
      <span>⚠</span>
      <span>Configure as credenciais Serpro na aba <strong>Credenciais</strong> para habilitar as consultas.</span>
    </div>
  )
}

function ResultItem({ label, value, highlight }: { label:string; value:string; highlight?:string }) {
  return (
    <div>
      <p className="text-xs text-dark-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ?? 'text-white'}`}>{value}</p>
    </div>
  )
}

function DeclaracoesList({ data }: { data: DecResult }) {
  const naoPageas = data.periodos.filter(p => p.das && !p.das.pago).length
  const semDas    = data.periodos.filter(p => !p.das).length

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-bold text-white">
          {data.anoCalendario} — {fmtCNPJ(data.cnpj)}
        </span>
        {naoPageas > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
            ⚠ {naoPageas} DAS não {naoPageas===1?'pago':'pagos'}
          </span>
        )}
        {semDas > 0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/30">
            {semDas} sem DAS gerado
          </span>
        )}
        {naoPageas===0 && semDas===0 && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ Tudo em dia
          </span>
        )}
      </div>

      {/* Periods */}
      <div className="space-y-2">
        {data.periodos.map(p => {
          const periodo  = String(p.periodoApuracao)
          const mes      = parseInt(periodo.slice(4,6))
          const ano      = periodo.slice(0,4)
          const label    = `${MESES[mes]}/${ano}`
          const isPago    = p.das?.pago === true
          const isNaoPago = p.das?.pago === false
          const semDas    = !p.das
          const vencido   = isNaoPago && isDasVencido(p.periodoApuracao)

          return (
            <div key={p.periodoApuracao} className={`flex items-center gap-3 px-4 py-3 rounded-xl border flex-wrap ${
              isNaoPago ? 'bg-red-500/5 border-red-500/20'
                        : semDas  ? 'bg-gold-500/5 border-gold-500/20'
                        : 'bg-dark-900 border-dark-800'
            }`}>
              <span className="text-sm font-bold text-white w-16">{label}</span>

              {isPago && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">✓ Pago</span>
              )}
              {isNaoPago && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">✕ Não pago</span>
              )}
              {semDas && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/25">Sem DAS</span>
              )}

              {/* Valor do DAS */}
              {isNaoPago && p.valorDas && (
                <span className="text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-0.5">
                  R$ {p.valorDas}
                </span>
              )}

              {p.das && (
                <span className="text-xs text-dark-500 font-mono">DAS {p.das.numeroDas}</span>
              )}
              {p.declaracoes[0] && (
                <span className="text-xs text-dark-600">Dec {p.declaracoes[0].numeroDeclaracao}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-xs text-dark-400 leading-relaxed">
        <strong className="text-dark-300">Sem DAS gerado:</strong> declaração transmitida mas DAS não emitido — provavelmente valor zero.<br />
        <strong className="text-dark-300">Não pago:</strong> DAS gerado mas pagamento não confirmado na Receita Federal.
      </div>
    </div>
  )
}
