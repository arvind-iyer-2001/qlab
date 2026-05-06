'use client'
import { useTest } from '@/hooks/useTest'
import { ProblemDetail } from '@/lib/api'

interface Props {
  problem: ProblemDetail
  code: string
}

export function TestTab({ problem, code }: Props) {
  const { mutate: runTest, data, isPending, error } = useTest()

  const handleRun = () => {
    const testCode = `${code}\n${problem.test_call}`
    runTest(testCode)
  }

  const output = data?.result ?? data?.output

  return (
    <div style={{ padding: '20px', color: '#eff1f6', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <section>
        <h4 style={{ color: '#aba9b0', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Test Call
        </h4>
        <div style={{ background: '#282828', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#ffa116' }}>
          {problem.test_call}
        </div>
      </section>

      <button
        onClick={handleRun}
        disabled={isPending}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 20px',
          background: isPending ? '#3a3a3a' : '#282828',
          color: isPending ? '#5a5a5a' : '#eff1f6',
          border: '1px solid #3a3a3a',
          borderRadius: '6px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontSize: '13px',
        }}
      >
        {isPending ? 'Running…' : 'Run'}
      </button>

      {error && (
        <div style={{ background: '#2a1a1a', border: '1px solid #ef4743', borderRadius: '6px', padding: '12px', color: '#ef4743', fontSize: '13px', fontFamily: 'monospace' }}>
          {(error as Error).message}
        </div>
      )}

      {output != null && (
        <section>
          <h4 style={{ color: '#aba9b0', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Output
          </h4>
          <div style={{ background: '#1e1e1e', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#eff1f6', whiteSpace: 'pre-wrap' }}>
            {output}
          </div>
        </section>
      )}
    </div>
  )
}
