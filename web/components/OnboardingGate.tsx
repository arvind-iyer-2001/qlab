'use client'
import { useAuth, useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

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
  // Once we've confirmed a nickname, never hit /users/me again — otherwise the
  // gate fires a fetch on every client-side route change for the whole session.
  const nicknameConfirmed = useRef(false)

  useEffect(() => {
    // Reset the cache on sign-out so a different user gets re-checked.
    if (!isLoaded || !isSignedIn) {
      nicknameConfirmed.current = false
      return
    }
    if (nicknameConfirmed.current) return
    // pathname is null during static pre-render — guard before .startsWith.
    if (!pathname || EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return

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
        if (!user.nickname) {
          router.replace('/profile/setup')
        } else {
          nicknameConfirmed.current = true
        }
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
