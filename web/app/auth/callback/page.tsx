'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/ui/Brand'

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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      try {
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 404) {
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3 px-6">
      <Brand size="lg" />
      <p className="text-base">{message}</p>
      <p className="text-zinc-500 text-sm">You can close this tab once VS Code opens.</p>
    </div>
  )
}
