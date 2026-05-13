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
        const [userRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/users/me/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (userRes.ok) setQlabUser(await userRes.json())
        if (statsRes.ok) setStats(await statsRes.json())
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
              {qlabUser?.nickname ? (
                <>
                  <p className="text-zinc-50 font-mono">{qlabUser.nickname}</p>
                  <a
                    href="/profile/setup"
                    className="text-emerald-400 text-xs hover:text-emerald-300 transition"
                  >
                    → change nickname
                  </a>
                </>
              ) : (
                <p className="text-rose-400 text-sm">
                  No nickname set.{' '}
                  <a href="/profile/setup" className="text-emerald-400 hover:text-emerald-300">
                    Set one now
                  </a>
                </p>
              )}
            </Card>

            {email && (
              <Card label="Email">
                <p className="text-zinc-50">{email}</p>
              </Card>
            )}

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
