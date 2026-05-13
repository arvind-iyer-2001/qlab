'use client'

import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { useRecentSubmissions } from '@/hooks/useHomeData'
import { RECENT_SUBMISSIONS } from '@/lib/home-stubs'
import type { Difficulty } from '@/lib/api'

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   'text-emerald-400',
  medium: 'text-amber-400',
  hard:   'text-rose-400',
}

export function LiveTicker() {
  const { data } = useRecentSubmissions(20)
  const source = (data && data.length > 0) ? data : RECENT_SUBMISSIONS

  const items = source.map((entry, idx) => ({
    quote: (
      <span className="font-mono text-sm">
        <span className="text-white">@{entry.handle}</span>
        {' solved '}
        <span className="text-white">{entry.problem_title}</span>
        {' in '}
        <span className="text-emerald-400">{entry.timing_ms}ms</span>
        {' / '}
        <span className="text-zinc-400">{entry.char_count} chars</span>
        {' · '}
        <span className={DIFFICULTY_COLOR[entry.difficulty]}>{entry.difficulty}</span>
      </span>
    ) as unknown as string,
    name: `${entry.handle}-${entry.problem_slug}-${idx}`,
    title: '',
  }))

  return (
    <section className="bg-zinc-950 py-10 border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          live · recent solves
        </p>
      </div>
      <InfiniteMovingCards items={items} direction="left" speed="slow" pauseOnHover />
    </section>
  )
}
