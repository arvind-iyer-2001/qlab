'use client'

import Link from 'next/link'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { PILLAR_STATS } from '@/lib/home-stubs'

export function ThreePillars() {
  return (
    <section className="bg-zinc-950 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Three ways to train
        </h2>
        <p className="text-zinc-400 mb-10 max-w-xl">
          Short problems for sharp reps. Capstones for the long game. A leaderboard that keeps score.
        </p>
        <BentoGrid className="md:grid-cols-3 max-w-6xl">
          <BentoGridItem
            title="Problems"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.problems.value} {PILLAR_STATS.problems.label} · single-function · judged on speed and length
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-emerald-900/40 to-zinc-900" />}
          />
          <BentoGridItem
            title="Capstones"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.capstones.value} · partitioned DBs, joins under load, tickerplant
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-amber-900/40 to-zinc-900" />}
          />
          <BentoGridItem
            title="Leaderboard"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.leaderboard.value} · public, per-problem, milliseconds matter
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-violet-900/40 to-zinc-900" />}
          />
        </BentoGrid>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/problems" className="text-emerald-400 font-mono text-sm hover:text-emerald-300">
            → browse problems
          </Link>
          <a href="#capstones" className="text-zinc-500 font-mono text-sm hover:text-zinc-300">
            → preview capstones
          </a>
        </div>
      </div>
    </section>
  )
}
