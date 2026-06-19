'use client'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Brand } from '@/components/ui/Brand'

function AuthCallbackInner() {
  const { getToken, isLoaded } = useAuth()
  const searchParams = useSearchParams()
  const fromVscode = searchParams.get('from') === 'vscode'
  const [message, setMessage] = useState('Signing you in to qLab…')

  useEffect(() => {
    if (!isLoaded) return

    function toVscode(token: string) {
      setMessage('Returning to VS Code…')
      window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
    }

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
        if (res.ok) {
          const user = await res.json()
          if (!user.nickname) {
            // New user — onboard. Preserve the VS Code origin only if real.
            window.location.href = fromVscode ? '/profile/setup?from=vscode' : '/profile/setup'
            return
          }
        }
      } catch {
        // API unreachable — fall through. Web users land in the app, where the
        // OnboardingGate re-checks; VS Code users still get their token.
      }

      // Returning user (has a nickname), or an error we let the gate handle.
      if (fromVscode) {
        toVscode(token)
      } else {
        window.location.href = '/problems'
      }
    }

    handleCallback()
  }, [isLoaded, getToken, fromVscode])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3 px-6">
      <Brand size="lg" />
      <p className="text-base">{message}</p>
      <p className="text-zinc-500 text-sm">You can close this tab once VS Code opens.</p>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  )
}
