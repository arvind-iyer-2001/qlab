'use client'
import { useUser, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface QLabUser {
  nickname: string | null
  display_name: string
  email: string
  avatar_url: string | null
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [qlabUser, setQlabUser] = useState<QLabUser | null>(null)
  const [loadingQlab, setLoadingQlab] = useState(true)

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
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setQlabUser(await res.json())
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading…</p>
      </div>
    )
  }

  const avatarUrl = qlabUser?.avatar_url || user.imageUrl
  const displayName = qlabUser?.display_name || user.fullName || user.username || 'qLab User'
  const email = qlabUser?.email || user.primaryEmailAddress?.emailAddress || ''

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      {avatarUrl && (
        <img src={avatarUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
      )}
      <h1 style={{ fontSize: '20px', fontWeight: 600 }}>{displayName}</h1>
      {email && <p style={{ color: '#888', fontSize: '14px' }}>{email}</p>}

      {!loadingQlab && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          {qlabUser?.nickname ? (
            <p style={{ fontSize: '15px' }}>
              Handle: <strong>{qlabUser.nickname}</strong>
            </p>
          ) : (
            <p style={{ color: '#c00', fontSize: '14px' }}>
              No nickname set.{' '}
              <a href="/profile/setup" style={{ color: '#0070f3' }}>Set one now</a>
            </p>
          )}
        </div>
      )}

      <p style={{ color: '#aaa', fontSize: '13px', marginTop: '4px' }}>Signed in to qLab</p>
    </div>
  )
}
