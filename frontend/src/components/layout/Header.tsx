interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  return (
    <header className="h-14 border-b border-dark-800 bg-dark-950 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-dark-100 font-semibold text-base">{title}</h1>
      {user && (
        <div className="flex items-center gap-2">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-dark-700" />
          )}
          <span className="text-dark-400 text-sm">{user.name}</span>
        </div>
      )}
    </header>
  )
}
