'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { useProblems } from '@/hooks/useProblems'

const WORDS = [
  { text: 'Solve.' },
  { text: 'Optimize.' },
  { text: 'Compete.', className: 'text-emerald-400' },
]

export function Hero() {
  const { isSignedIn, user } = useUser()
  const { data: submissions } = useMySubmissions()
  const { data: problems } = useProblems()

  const handle = user?.username ?? user?.firstName ?? 'qLab User'
  const lastSubmission = submissions?.[0]
  const lastSlug = lastSubmission
    ? problems?.find((p) => p.id === lastSubmission.problem_id)?.slug
    : undefined

  const correctIds = new Set(
    (submissions ?? []).filter((s) => s.status === 'correct').map((s) => s.problem_id),
  )
  const solvedCount = correctIds.size
  const bestTimeMs = (submissions ?? [])
    .filter((s) => s.status === 'correct' && typeof s.timing_ms === 'number')
    .reduce<number | null>((min, s) => (min == null ? s.timing_ms! : Math.min(min, s.timing_ms!)), null)

  return (
    <section className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden bg-zinc-950">
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="font-mono text-sm text-emerald-400/80 mb-4">qLab — the q dojo</p>
        <TypewriterEffect words={WORDS} className="!text-5xl md:!text-7xl !text-white" />
        {isSignedIn && solvedCount > 0 ? (
          <p className="mt-6 font-mono text-sm text-zinc-400">
            Welcome back, <span className="text-white">@{handle}</span> ·
            {' '}{solvedCount} solved{bestTimeMs != null ? ` · best ${bestTimeMs}ms` : ''}
          </p>
        ) : (
          <p className="mt-6 text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto">
            Leetcode for q today. A capstone gauntlet tomorrow. Real q process,
            instant judging, leaderboards measured in milliseconds and characters.
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {isSignedIn && lastSlug ? (
            <>
              <Link
                href={`/problems/${lastSlug}`}
                className="px-6 py-3 rounded-md bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition"
              >
                Continue → {lastSlug}
              </Link>
              <Link
                href="/problems"
                className="px-6 py-3 rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition"
              >
                Browse all problems
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/problems"
                className="px-6 py-3 rounded-md bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition"
              >
                Start solving
              </Link>
              <a
                href="#capstones"
                className="px-6 py-3 rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition"
              >
                Try a capstone <span className="ml-2 text-xs text-zinc-500">coming soon</span>
              </a>
            </>
          )}
        </div>
      </div>
      <BackgroundBeams />
    </section>
  )
}
