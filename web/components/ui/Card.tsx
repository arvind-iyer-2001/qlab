interface CardProps {
  label?: string
  children: React.ReactNode
  className?: string
}

export function Card({ label, children, className = '' }: CardProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      {label && (
        <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1.5">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
