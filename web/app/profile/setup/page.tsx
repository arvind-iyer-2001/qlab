'use client'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ProfileSetup() {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromVscode = searchParams.get('from') === 'vscode'

  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Nickname cannot be empty'); return }
    if (trimmed.length > 30) { setError('Nickname must be 30 characters or fewer'); return }
    setError('')
    setSaving(true)

    try {
      const token = await getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.detail
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to save nickname')
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
        setSaving(false)
        return
      }

      if (fromVscode) {
        const freshToken = await getToken()
        window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(freshToken ?? '')}`
      } else {
        router.push('/profile')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600 }}>Choose your qLab nickname</h1>
      <p style={{ color: '#666', fontSize: '14px', marginTop: '-8px' }}>This is how you'll appear on the leaderboard.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="e.g. qwizard"
          maxLength={30}
          style={{ padding: '8px 12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
          autoFocus
        />
        {error && <p style={{ color: '#c00', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '9px 0', fontSize: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </div>
  )
}
