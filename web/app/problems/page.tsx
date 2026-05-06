'use client'
import { useProblems } from '@/hooks/useProblems'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { ProblemsTable } from '@/components/ProblemsTable'
import { useRouter } from 'next/navigation'

export default function ProblemsPage() {
  const { data: problems, isLoading, error } = useProblems()
  const { data: mySubmissions = [] } = useMySubmissions()
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <span
            style={{ color: '#ffa116', fontWeight: 700, fontSize: '20px', cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            qLab
          </span>
          <span style={{ color: '#5a5a5a', margin: '0 8px' }}>/</span>
          <span style={{ color: '#eff1f6', fontSize: '16px' }}>Problems</span>
        </div>
        <a href="/profile" style={{ color: '#aba9b0', fontSize: '13px', textDecoration: 'none' }}>
          Profile
        </a>
      </div>

      {isLoading && <p style={{ color: '#aba9b0' }}>Loading problems…</p>}
      {error && <p style={{ color: '#ef4743' }}>Failed to load problems.</p>}
      {problems && (
        <ProblemsTable problems={problems} mySubmissions={mySubmissions} />
      )}
    </div>
  )
}
