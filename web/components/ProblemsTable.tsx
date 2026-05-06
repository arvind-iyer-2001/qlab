'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Difficulty, MySubmissionEntry, ProblemSummary } from '@/lib/api'
import { Pill } from '@/components/ui/Pill'

interface Props {
  problems: ProblemSummary[]
  mySubmissions: MySubmissionEntry[]
}

const DIFF_TEXT: Record<Difficulty, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-rose-400',
}

const FILTERS = ['All', 'Easy', 'Medium', 'Hard'] as const
type Filter = typeof FILTERS[number]

export function ProblemsTable({ problems, mySubmissions }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('All')

  const bestByProblemId = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of mySubmissions) {
      if (s.is_best && s.timing_ms != null) {
        map.set(s.problem_id, s.timing_ms)
      }
    }
    return map
  }, [mySubmissions])

  const filtered = useMemo(
    () =>
      filter === 'All'
        ? problems
        : problems.filter((p) => p.difficulty === filter.toLowerCase()),
    [problems, filter],
  )

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Pill>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
            <th className="text-left px-3 py-2 w-12">#</th>
            <th className="text-left px-3 py-2">Title</th>
            <th className="text-left px-3 py-2 w-24">Difficulty</th>
            <th className="text-left px-3 py-2">Concepts</th>
            <th className="text-right px-3 py-2 w-24">Best</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const bestMs = bestByProblemId.get(p.id)
            return (
              <tr
                key={p.id}
                onClick={() => router.push(`/problems/${p.slug}`)}
                className="border-b border-zinc-900 cursor-pointer hover:bg-zinc-900/50 transition"
              >
                <td className="px-3 py-3 text-zinc-600">{p.id}</td>
                <td className="px-3 py-3 text-zinc-50 font-medium">{p.title}</td>
                <td className="px-3 py-3">
                  <span className={`${DIFF_TEXT[p.difficulty]} font-medium capitalize`}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-400 text-xs">
                  {p.concepts.join(', ')}
                </td>
                <td className="px-3 py-3 text-right">
                  {bestMs != null ? (
                    <span className="text-emerald-400 font-mono">✓ {bestMs}ms</span>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
