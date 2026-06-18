'use client'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Brand } from '@/components/ui/Brand'
import { Button } from '@/components/ui/Button'

function ProfileSetupInner() {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromVscode = searchParams.get('from') === 'vscode'

  const [nickname, setNickname] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
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
      if (!token) {
        setError('Session expired. Please refresh the page.')
        setSaving(false)
        return
      }
      // Optional base64 license key, sent alongside the nickname in one request.
      const license_b64 = licenseKey.trim() || undefined

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed, ...(license_b64 ? { license_b64 } : {}) }),
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6 py-8 gap-6">
      <Brand as="link" size="lg" />
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-1">Choose your qLab nickname</h1>
        <p className="text-zinc-400 text-sm mb-5">
          This is how you&apos;ll appear on the leaderboard.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. qwizard"
            maxLength={30}
            autoFocus
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono"
          />

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-zinc-300 text-sm font-medium">
              kdb+ license key <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <p className="text-zinc-500 text-xs m-0">
              Paste your base64 license key to run submissions under your own license. You can add this later.
              {' '}You can fetch this license key from{' '}
              <a
                href="https://developer.kx.com/products/kdb-x/install"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                here
              </a>.
            </p>
            <textarea
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="base64 license key…"
              rows={3}
              spellCheck={false}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono text-xs resize-y break-all"
            />
          </div>

          {error && <p className="text-rose-400 text-xs m-0">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save and continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ProfileSetup() {
  return (
    <Suspense>
      <ProfileSetupInner />
    </Suspense>
  )
}
