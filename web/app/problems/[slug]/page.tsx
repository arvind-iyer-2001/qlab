'use client'
import { useRouter } from 'next/navigation'
import { useProblem } from '@/hooks/useProblem'
import { ProblemLayout } from '@/components/ProblemLayout'

const DIFF_COLORS = { easy: '#00b8a3', medium: '#ffc01e', hard: '#ef4743' } as const

export default function ProblemPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router = useRouter()
  const { data: problem, isLoading, error } = useProblem(slug)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' }}>
      {/* Nav bar */}
      <div style={{ height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#282828', borderBottom: '1px solid #3a3a3a', flexShrink: 0, gap: '8px' }}>
        <span
          style={{ color: '#ffa116', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }}
          onClick={() => router.push('/')}
        >
          qLab
        </span>
        <span style={{ color: '#5a5a5a' }}>/</span>
        <span
          style={{ color: '#aba9b0', cursor: 'pointer', fontSize: '14px' }}
          onClick={() => router.push('/problems')}
        >
          Problems
        </span>
        {problem && (
          <>
            <span style={{ color: '#5a5a5a' }}>/</span>
            <span style={{ color: '#eff1f6', fontSize: '14px', fontWeight: 500 }}>{problem.title}</span>
            <span
              style={{
                marginLeft: '4px',
                fontSize: '12px',
                color: DIFF_COLORS[problem.difficulty],
                textTransform: 'capitalize',
              }}
            >
              {problem.difficulty}
            </span>
          </>
        )}
      </div>

      {/* Body */}
      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#aba9b0' }}>Loading…</p>
        </div>
      )}
      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#ef4743' }}>Problem not found.</p>
        </div>
      )}
      {problem && <ProblemLayout problem={problem} />}
    </div>
  )
}
