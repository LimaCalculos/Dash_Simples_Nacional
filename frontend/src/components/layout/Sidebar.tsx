import { NavLink } from 'react-router-dom'
import { LayoutDashboard, RefreshCw, LogOut, FileSearch } from 'lucide-react'
import clsx from 'clsx'
import { useDriveStatus, useSyncNow } from '../../hooks'

export default function Sidebar() {
  const { data: driveStatus } = useDriveStatus()
  const syncMutation = useSyncNow()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-dark-950 border-r border-dark-800 flex flex-col z-20">
      {/* Logo Lima Cálculos */}
      <div className="px-5 py-5 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-8">
            <div className="w-1.5 h-4 rounded-sm bg-gold-500" />
            <div className="w-1.5 h-6 rounded-sm bg-gold-400" />
            <div className="w-1.5 h-8 rounded-sm bg-gold-300" />
            <div className="w-1.5 h-5 rounded-sm bg-gold-500" />
          </div>
          <div>
            <p className="text-silver-400 font-bold text-lg leading-none tracking-widest uppercase">Lima</p>
            <p className="text-white/60 text-[10px] tracking-[0.3em] uppercase font-medium">Cálculos</p>
          </div>
        </div>
        <div className="gold-line mt-4" />
        <p className="text-dark-500 text-[10px] mt-2 tracking-widest uppercase">Simples Nacional</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive
              ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
              : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
          )}
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard size={17} className={isActive ? 'text-gold-400' : ''} />
              Dashboard
            </>
          )}
        </NavLink>

        <NavLink
          to="/serpro"
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            isActive
              ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
              : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
          )}
        >
          {({ isActive }) => (
            <>
              <FileSearch size={17} className={isActive ? 'text-gold-400' : ''} />
              Consulta Serpro
            </>
          )}
        </NavLink>
      </nav>

      {/* Drive status + sync */}
      <div className="px-4 py-3 border-t border-dark-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              driveStatus?.connected ? 'bg-green-400' : 'bg-red-400'
            )} />
            <span className="text-dark-400 text-xs">
              {driveStatus?.status === 'running' ? 'Sincronizando...' :
               driveStatus?.connected ? 'Drive conectado' : 'Drive desconectado'}
            </span>
          </div>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || driveStatus?.status === 'running'}
            className="p-1 text-dark-500 hover:text-gold-400 transition-colors disabled:opacity-40"
            title="Sincronizar agora"
          >
            <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
          </button>
        </div>
        {driveStatus?.ultima_verificacao && (
          <p className="text-dark-600 text-[10px]">
            Última sync: {new Date(driveStatus.ultima_verificacao).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* User + logout */}
      <div className="px-3 pb-4 border-t border-dark-800 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-400 hover:bg-dark-800 hover:text-dark-200 transition-all w-full"
        >
          <LogOut size={17} />
          Sair
        </button>
        <p className="text-dark-600 text-[10px] mt-3 px-3 tracking-wider">v1.0.0 · Lima Cálculos</p>
      </div>
    </aside>
  )
}
