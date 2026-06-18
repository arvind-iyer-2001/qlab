'use client'
import { useUser, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Crumbs } from '@/components/ui/Crumbs'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface QLabUser {
  nickname: string | null
  display_name: string
  email: string
  avatar_url: string | null
}

interface UserStats {
  total_solves: number
  total_problems: number
  by_difficulty: { easy: number; medium: number; hard: number }
  totals_by_difficulty: { easy: number; medium: number; hard: number }
}

const DIFF_COLORS = { easy: '#00b8a3', medium: '#ffc01e', hard: '#ef4743' } as const

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [qlabUser, setQlabUser] = useState<QLabUser | null>(null)
  const [loadingQlab, setLoadingQlab] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [editingNick, setEditingNick] = useState(false)
  const [nickDraft, setNickDraft] = useState('')
  const [nickError, setNickError] = useState('')
  const [savingNick, setSavingNick] = useState(false)
  const [hasLicense, setHasLicense] = useState(false)
  const [licenseKey, setLicenseKey] = useState('')
  const [savingLicense, setSavingLicense] = useState(false)
  const [licenseMsg, setLicenseMsg] = useState('')

  async function saveLicense() {
    const license_b64 = licenseKey.trim()
    if (!license_b64) return
    if (!qlabUser?.nickname) { setLicenseMsg('Set a nickname first.'); return }
    setLicenseMsg('')
    setSavingLicense(true)
    try {
      const token = await getToken()
      if (!token) { setLicenseMsg('Session expired'); setSavingLicense(false); return }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: qlabUser.nickname, license_b64 }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setLicenseMsg(typeof body?.detail === 'string' ? body.detail : 'Save failed')
      } else {
        setHasLicense(true)
        setLicenseKey('')
        setLicenseMsg('License saved ✓')
      }
    } catch {
      setLicenseMsg('Network error')
    } finally {
      setSavingLicense(false)
    }
  }

  async function saveNickname() {
    const trimmed = nickDraft.trim()
    if (!trimmed) { setNickError('Nickname cannot be empty'); return }
    if (trimmed.length > 30) { setNickError('Max 30 characters'); return }
    setNickError('')
    setSavingNick(true)
    try {
      const token = await getToken()
      if (!token) { setNickError('Session expired'); setSavingNick(false); return }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.detail
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to save')
        setNickError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      } else {
        const updated = await res.json()
        setQlabUser(updated)
        setEditingNick(false)
      }
    } catch {
      setNickError('Network error')
    } finally {
      setSavingNick(false)
    }
  }

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace('/sign-in')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (!isLoaded || !user) return
    async function fetchQlabUser() {
      try {
        const token = await getToken()
        if (!token) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        const [userRes, statsRes, licRes] = await Promise.all([
          fetch(`${apiUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/users/me/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/users/me/license`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (userRes.ok) setQlabUser(await userRes.json())
        if (statsRes.ok) setStats(await statsRes.json())
        if (licRes.ok) setHasLicense((await licRes.json())?.has_license ?? false)
      } catch {
        // API unreachable
      } finally {
        setLoadingQlab(false)
      }
    }
    fetchQlabUser()
  }, [isLoaded, user, getToken])

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <p>Loading…</p>
      </div>
    )
  }

  const avatarUrl = qlabUser?.avatar_url || user.imageUrl
  const displayName = qlabUser?.display_name || user.fullName || user.username || 'qLab User'
  const email = qlabUser?.email || user.primaryEmailAddress?.emailAddress || ''

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(16,185,129,0.08), transparent 60%)',
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto px-8 py-8">
        <Crumbs current="Profile" />

        <div className="flex items-center gap-5 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border border-zinc-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-zinc-400 text-sm font-mono mt-1">
              {qlabUser?.nickname ? `@${qlabUser.nickname}` : 'no handle'}
            </p>
          </div>
        </div>

        {!loadingQlab && (
          <div className="space-y-3">
            <Card label="Handle">
              {editingNick ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      autoFocus
                      value={nickDraft}
                      onChange={(e) => setNickDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveNickname()
                        if (e.key === 'Escape') { setEditingNick(false); setNickError('') }
                      }}
                      maxLength={30}
                      placeholder="e.g. qwizard"
                      className="flex-1 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                    />
                    <button
                      onClick={saveNickname}
                      disabled={savingNick}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded text-xs font-semibold disabled:opacity-50"
                    >
                      {savingNick ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingNick(false); setNickError('') }}
                      className="px-3 py-1 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  {nickError && <p className="text-rose-400 text-xs m-0">{nickError}</p>}
                </div>
              ) : qlabUser?.nickname ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-zinc-50 font-mono">{qlabUser.nickname}</p>
                  <button
                    onClick={() => { setNickDraft(qlabUser.nickname ?? ''); setEditingNick(true) }}
                    title="Edit nickname"
                    className="text-emerald-400 text-xs hover:text-emerald-300 transition"
                  >
                    ✎ edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-rose-400 text-sm m-0">No nickname set.</p>
                  <button
                    onClick={() => { setNickDraft(''); setEditingNick(true) }}
                    className="text-emerald-400 text-xs hover:text-emerald-300 transition"
                  >
                    Set one
                  </button>
                </div>
              )}
            </Card>

            {email && (
              <Card label="Email">
                <p className="text-zinc-50">{email}</p>
              </Card>
            )}

            <Card label="kdb+ License">
              <div className="flex flex-col gap-2">
                <p className="text-sm m-0">
                  {hasLicense
                    ? <span className="text-emerald-400">License on file ✓</span>
                    : <span className="text-zinc-400">No license uploaded — submissions use the shared host license.</span>}
                </p>
                <p className="text-zinc-500 text-xs m-0">
                  Paste your base64 license key to run submissions under your own license.
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
                  onChange={(e) => { setLicenseKey(e.target.value); setLicenseMsg('') }}
                  placeholder="base64 license key…"
                  rows={3}
                  spellCheck={false}
                  className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono text-xs resize-y break-all"
                />
                <div>
                  <button
                    onClick={saveLicense}
                    disabled={!licenseKey.trim() || savingLicense || !qlabUser?.nickname}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded text-xs font-semibold disabled:opacity-40"
                  >
                    {savingLicense ? 'Saving…' : hasLicense ? 'Replace' : 'Save'}
                  </button>
                </div>
                {!qlabUser?.nickname && (
                  <p className="text-zinc-500 text-xs m-0">Set a nickname above before uploading a license.</p>
                )}
                {licenseMsg && (
                  <p className={`text-xs m-0 ${licenseMsg.includes('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{licenseMsg}</p>
                )}
              </div>
            </Card>

            {stats && (
              <Card label="Stats">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400">
                    {stats.total_solves}
                  </span>
                  <span className="text-zinc-400 text-sm">
                    / {stats.total_problems} solved
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {(['easy', 'medium', 'hard'] as const).map((d) => {
                    const solved = stats.by_difficulty[d]
                    const total = stats.totals_by_difficulty[d]
                    const pct = total > 0 ? (solved / total) * 100 : 0
                    return (
                      <div key={d}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span
                            className="text-xs capitalize font-medium"
                            style={{ color: DIFF_COLORS[d] }}
                          >
                            {d}
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            {solved}/{total}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: DIFF_COLORS[d] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <p className="text-zinc-500 text-xs">Signed in to qLab</p>
          <Button as="link" href="/sign-out" variant="secondary">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
