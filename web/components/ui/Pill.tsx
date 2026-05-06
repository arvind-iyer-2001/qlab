'use client'

interface PillProps {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function Pill({ active = false, onClick, children }: PillProps) {
  const base = 'px-3.5 py-1 rounded-full text-xs transition cursor-pointer select-none'
  const styles = active
    ? 'bg-emerald-500 text-zinc-950 font-semibold'
    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}
