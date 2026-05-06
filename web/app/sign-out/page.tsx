'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { Brand } from '@/components/ui/Brand'

export default function SignOut() {
  const { signOut } = useClerk()

  useEffect(() => {
    signOut({ redirectUrl: '/sign-in' })
  }, [signOut])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4">
      <Brand size="lg" />
      <p className="text-zinc-400 text-base">Signing out…</p>
    </div>
  )
}
