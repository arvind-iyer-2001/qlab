'use client'
import { useLeaderboard } from '@/hooks/useLeaderboard'

interface Props {
  slug: string
}

export function LeaderboardTab({ slug }: Props) {
  const { data: entries, isLoading } = useLeaderboard(slug)

  if (isLoading) return <div style={{ padding: '20px', color: '#aba9b0' }}>Loading leaderboard…</div>
  if (!entries || entries.length === 0) {
    return <div style={{ padding: '20px', color: '#5a5a5a' }}>No submissions yet. Be the first!</div>
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ color: '#aba9b0', borderBottom: '1px solid #3a3a3a' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px', width: '40px' }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 10px' }}>Handle</th>
            <th style={{ textAlign: 'right', padding: '8px 10px' }}>Time</th>
            <th style={{ textAlign: 'right', padding: '8px 10px' }}>Chars</th>
            <th style={{ textAlign: 'right', padding: '8px 10px' }}>Lang</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.rank} style={{ borderBottom: '1px solid #3a3a3a' }}>
              <td style={{ padding: '10px 10px', color: '#5a5a5a' }}>{e.rank}</td>
              <td style={{ padding: '10px 10px', color: '#eff1f6', fontWeight: 500 }}>{e.handle}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', color: '#ffa116', fontWeight: 600 }}>{e.timing_ms}ms</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', color: '#aba9b0' }}>{e.char_count}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', color: '#5a5a5a' }}>{e.language}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
