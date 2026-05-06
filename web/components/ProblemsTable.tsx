'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Difficulty, MySubmissionEntry, ProblemSummary } from '@/lib/api'

interface Props {
  problems: ProblemSummary[]
  mySubmissions: MySubmissionEntry[]
}

const DIFF_COLORS: Record<Difficulty, string> = {
  easy: '#00b8a3',
  medium: '#ffc01e',
  hard: '#ef4743',
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
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 14px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: filter === f ? 600 : 400,
              background: filter === f ? '#ffa116' : '#282828',
              color: filter === f ? '#1a1a1a' : '#aba9b0',
              transition: 'background 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ color: '#aba9b0', borderBottom: '1px solid #3a3a3a' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', width: '48px' }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Title</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', width: '100px' }}>Difficulty</th>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Concepts</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', width: '100px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const bestMs = bestByProblemId.get(p.id)
            return (
              <tr
                key={p.id}
                onClick={() => router.push(`/problems/${p.slug}`)}
                style={{
                  borderBottom: '1px solid #3a3a3a',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#282828')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 12px', color: '#5a5a5a' }}>{p.id}</td>
                <td style={{ padding: '12px 12px', color: '#eff1f6', fontWeight: 500 }}>{p.title}</td>
                <td style={{ padding: '12px 12px' }}>
                  <span
                    style={{
                      color: DIFF_COLORS[p.difficulty],
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p.difficulty}
                  </span>
                </td>
                <td style={{ padding: '12px 12px', color: '#aba9b0', fontSize: '12px' }}>
                  {p.concepts.join(', ')}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  {bestMs != null ? (
                    <span style={{ color: '#00b8a3', fontWeight: 600 }}>✓ {bestMs}ms</span>
                  ) : (
                    <span style={{ color: '#5a5a5a' }}>—</span>
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
