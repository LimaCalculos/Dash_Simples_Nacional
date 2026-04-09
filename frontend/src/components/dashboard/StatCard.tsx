import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'gold' | 'red' | 'amber' | 'green' | 'blue'
  subtitle?: string
  alert?: boolean
}

const colorMap = {
  gold:  { border: 'border-gold-500/30',  icon: 'text-gold-400',  bg: 'bg-gold-500/10',  val: 'text-gold-400' },
  red:   { border: 'border-red-500/30',   icon: 'text-red-400',   bg: 'bg-red-500/10',   val: 'text-red-400' },
  amber: { border: 'border-amber-500/30', icon: 'text-amber-400', bg: 'bg-amber-500/10', val: 'text-amber-400' },
  green: { border: 'border-green-500/30', icon: 'text-green-400', bg: 'bg-green-500/10', val: 'text-green-400' },
  blue:  { border: 'border-blue-500/30',  icon: 'text-blue-400',  bg: 'bg-blue-500/10',  val: 'text-blue-400' },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle, alert }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={clsx(
      'bg-dark-900 rounded-xl border p-5 transition-colors hover:border-opacity-80',
      alert ? 'border-amber-500/50 bg-amber-950/10' : c.border
    )}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-dark-400 font-medium uppercase tracking-wider">{title}</p>
          <p className={clsx('text-3xl font-bold mt-2', alert ? 'text-amber-400' : c.val)}>{value}</p>
          {subtitle && <p className="text-xs text-dark-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', alert ? 'bg-amber-500/10' : c.bg)}>
          <Icon size={20} className={alert ? 'text-amber-400' : c.icon} />
        </div>
      </div>
    </div>
  )
}
