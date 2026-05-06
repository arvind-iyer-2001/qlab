'use client'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { MySubmissionEntry } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  correct: '#00b8a3',
  wrong: '#ef4743',
  error: '#ef4743',
  error_runtime: '#ef4743',
  error_parse: '#ef4743',
  timeout: '#ffc01e',
}

const STATUS_LABELS: Record<string, string> = {
  correct: 'Accepted',
  wrong: 'Wrong Answer',
  error: 'Runtime Error',
  error_runtime: 'Runtime Error',
  error_parse: 'Parse Error',
  timeout: 'Time Limit Exceeded',
}

interface Props {
  problemId: number
  onLoadCode: (code: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function MySubmissionsTab({ problemId, onLoadCode }: Props) {
  const { data, isLoading, error } = useMySubmissions(problemId)

  if (isLoading) {
    return (
      <div style={{ padding: '20px', color: '#aba9b0' }}>Loading...</div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          margin: '20px',
          background: '#2a1a1a',
          border: '1px solid #ef4743',
          borderRadius: '6px',
          padding: '12px',
          color: '#ef4743',
          fontSize: '13px',
          fontFamily: 'monospace',
        }}
      >
        {(error as Error).message}
      </div>
    )
  }

  const rows: MySubmissionEntry[] = data ?? []

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          color: '#aba9b0',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        No submissions yet - submit your first solution to see it here.
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          color: '#eff1f6',
        }}
      >
        <thead>
          <tr style={{ color: '#aba9b0', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Date</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Status</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Timing</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Chars</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Lang</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Best</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={() => {
                if (r.code) onLoadCode(r.code)
              }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = '#252525'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
              }}
            >
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>{formatDate(r.submitted_at)}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', color: STATUS_COLORS[r.status] ?? '#eff1f6' }}>
                {STATUS_LABELS[r.status] ?? r.status}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>
                {r.timing_ms != null ? `${r.timing_ms} ms` : '-'}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>
                {r.char_count != null ? r.char_count : '-'}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>{r.language}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', color: '#ffd700' }}>
                {r.is_best ? '*' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
