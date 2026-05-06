'use client'

import { TOP_FIVE, WEEKLY_SOLVES } from '@/lib/home-stubs'

export function LeaderboardStrip() {
  return (
    <section className="bg-zinc-950 py-20 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-4">
            global · top 5
          </p>
          <ul className="font-mono text-sm divide-y divide-zinc-900">
            {TOP_FIVE.map((row) => (
              <li key={row.rank} className="flex items-center justify-between py-3">
                <span className="text-zinc-500 w-8">#{row.rank}</span>
                <span className="text-white flex-1">@{row.handle}</span>
                <span className="text-emerald-400 w-20 text-right">{row.best_time_ms}ms</span>
                <span className="text-zinc-400 w-24 text-right">{row.solved} solved</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-2">
            this week
          </p>
          <p className="text-6xl md:text-7xl font-bold text-white tabular-nums">
            {WEEKLY_SOLVES}
          </p>
          <p className="text-zinc-400 text-sm mt-2">correct submissions</p>
        </div>
      </div>
    </section>
  )
}
