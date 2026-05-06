import { Brand } from './Brand'

interface CrumbsProps {
  current: string
  rightSlot?: React.ReactNode
}

export function Crumbs({ current, rightSlot }: CrumbsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Brand as="link" size="md" />
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">{current}</span>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  )
}
