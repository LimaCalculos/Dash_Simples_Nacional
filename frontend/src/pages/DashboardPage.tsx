import { useState } from 'react'
import clsx from 'clsx'
import VisaoGeral from '../components/tabs/VisaoGeral'
import PorCliente from '../components/tabs/PorCliente'
import TabMensal from '../components/tabs/TabMensal'

type Tab = 'geral' | 'cliente' | 'mensal'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'geral',   label: 'Visão Geral',   desc: 'KPIs totais e evolução temporal' },
  { id: 'cliente', label: 'Por Cliente',   desc: 'Detalhes e histórico individual' },
  { id: 'mensal',  label: 'Controle Mensal', desc: 'Matriz de declarações por mês' },
]

export default function DashboardPage() {
  const [active, setActive] = useState<Tab>('geral')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-dark-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={clsx(
                'flex-1 px-5 py-4 text-sm font-medium transition-all text-left',
                active === tab.id
                  ? 'bg-gold-500/5 text-gold-400 border-b-2 border-gold-500'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50 border-b-2 border-transparent'
              )}
            >
              <div className="font-semibold">{tab.label}</div>
              <div className="text-[11px] text-dark-500 mt-0.5">{tab.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {active === 'geral'   && <VisaoGeral />}
      {active === 'cliente' && <PorCliente />}
      {active === 'mensal'  && <TabMensal />}
    </div>
  )
}
