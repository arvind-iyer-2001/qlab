'use client'
import { useAuth, useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Paths that must never be redirected away from: auth flows and the setup page
// itself. Matched by prefix.
const EXCLUDED_PREFIXES = ['/sign-in', '/sign-up', '/auth', '/sign-out', '/profile/setup']

/**
 * Durable onboarding gate.
 *
 * The one-shot redirect in /auth/callback only fires when a user passes cleanly
 * through it right after signing in. This component is the path-independent
 * safety net: on any authenticated route, a signed-in user with no nickname is
 * sent to /profile/setup — covering already-signed-in sessions, reopened tabs,
 * and backend hiccups the callback missed. Renders nothing.
 */
export function OnboardingGate() {
  const { isLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return

    let cancelled = false
    async function check() {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled || !res.ok) return
        const user = await res.json()
        if (!user.nickname) router.replace('/profile/setup')
      } catch {
        // Fail open — never trap the user in a redirect loop if the API is down.
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, pathname, getToken, router])

  return null
}
