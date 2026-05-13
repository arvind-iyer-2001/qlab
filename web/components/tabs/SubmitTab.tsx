'use client'
import { useEffect } from 'react'
import { useSubmit } from '@/hooks/useSubmit'
import { ProblemDetail, SubmissionStatus } from '@/lib/api'

interface Props {
  problem: ProblemDetail
  code: string
  registerRun?: (fn: () => void) => void
}

const STATUS_COLORS: Partial<Record<SubmissionStatus, string>> = {
  correct: '#00b8a3',
  wrong: '#ef4743',
  error: '#ef4743',
  error_runtime: '#ef4743',
  error_parse: '#ef4743',
  timeout: '#ffc01e',
  invalid: '#ef4743',
}

const STATUS_LABELS: Partial<Record<SubmissionStatus, string>> = {
  correct: 'Accepted',
  wrong: 'Wrong Answer',
  error: 'Runtime Error',
  error_runtime: 'Runtime Error',
  error_parse: 'Parse Error',
  timeout: 'Time Limit Exceeded',
  invalid: 'Invalid Submission',
}

export function SubmitTab({ problem, code, registerRun }: Props) {
  const { mutate: submit, data, isPending, error } = useSubmit(problem.slug)

  const handleSubmit = () => {
    submit({ problem_id: problem.id, code, language: 'q' })
  }

  useEffect(() => {
    registerRun?.(handleSubmit)
  })

  return (
    <div style={{ padding: '20px', color: '#eff1f6', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <p style={{ margin: 0, color: '#aba9b0', fontSize: '13px' }}>
        Submits the code from the editor. Must define a function named{' '}
        <code style={{ color: '#ffa116' }}>func</code> with a single parameter.
      </p>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 24px',
          background: isPending ? '#7a5010' : '#ffa116',
          color: isPending ? '#aba9b0' : '#1a1a1a',
          border: 'none',
          borderRadius: '6px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        {isPending ? 'Judging…' : 'Submit'}
      </button>

      {error && (
        <div style={{ background: '#2a1a1a', border: '1px solid #ef4743', borderRadius: '6px', padding: '12px', color: '#ef4743', fontSize: '13px' }}>
          {(error as Error).message}
        </div>
      )}

      {data && (
        <div style={{ background: '#282828', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: STATUS_COLORS[data.status] ?? '#aba9b0' }}>
              {STATUS_LABELS[data.status] ?? data.status}
            </span>
          </div>

          {data.status === 'correct' && (
            <div style={{ display: 'flex', gap: '24px' }}>
              {data.timing_ms != null && (
                <div>
                  <div style={{ color: '#5a5a5a', fontSize: '12px' }}>Time</div>
                  <div style={{ color: '#ffa116', fontWeight: 600 }}>{data.timing_ms}ms</div>
                </div>
              )}
              {data.char_count != null && (
                <div>
                  <div style={{ color: '#5a5a5a', fontSize: '12px' }}>Length</div>
                  <div style={{ color: '#eff1f6', fontWeight: 600 }}>{data.char_count} chars</div>
                </div>
              )}
              {data.leaderboard_rank != null && (
                <div>
                  <div style={{ color: '#5a5a5a', fontSize: '12px' }}>Rank</div>
                  <div style={{ color: '#00b8a3', fontWeight: 600 }}>#{data.leaderboard_rank}</div>
                </div>
              )}
            </div>
          )}

          {data.error && (
            <pre style={{ margin: 0, background: '#1e1e1e', padding: '10px', borderRadius: '4px', fontSize: '12px', color: '#ef4743', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
              {data.error}
            </pre>
          )}

          {data.status === 'wrong' && data.failing_input && (
            <div style={{ fontSize: '13px' }}>
              <div style={{ color: '#5a5a5a', marginBottom: '4px' }}>Failing input:</div>
              <code style={{ color: '#eff1f6' }}>{data.failing_input}</code>
              <div style={{ color: '#5a5a5a', marginTop: '8px', marginBottom: '4px' }}>Expected:</div>
              <code style={{ color: '#00b8a3' }}>{data.expected_output}</code>
              <div style={{ color: '#5a5a5a', marginTop: '8px', marginBottom: '4px' }}>Got:</div>
              <code style={{ color: '#ef4743' }}>{data.actual_output}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
