'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth()
  const [message, setMessage] = useState('Signing you in to qLab…')

  useEffect(() => {
    if (!isLoaded) return

    async function handleCallback() {
      const token = await getToken()
      if (!token) {
        setMessage('Could not get token. Please try signing in again.')
        return
      }

      // Check if user has a nickname; redirect to setup if not
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      try {
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 404) {
          // New user — webhook hasn't fired yet or is still propagating.
          // Send them to nickname setup; the webhook will create the record
          // (or PATCH /users/me/nickname will 404, handled there).
          window.location.href = '/profile/setup?from=vscode'
          return
        }
        if (res.ok) {
          const user = await res.json()
          if (!user.nickname) {
            window.location.href = '/profile/setup?from=vscode'
            return
          }
        }
      } catch {
        // API unreachable — proceed to VS Code anyway
      }

      setMessage('Returning to VS Code…')
      window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
    }

    handleCallback()
  }, [isLoaded, getToken])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '18px' }}>{message}</p>
      <p style={{ color: '#888', fontSize: '14px' }}>You can close this tab once VS Code opens.</p>
    </div>
  )
}
