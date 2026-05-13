'use client'
import { useUser } from '@clerk/nextjs'
import { useProblems } from '@/hooks/useProblems'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { ProblemsTable } from '@/components/ProblemsTable'
import { Crumbs } from '@/components/ui/Crumbs'
import { ProfileAvatarLink } from '@/components/ui/ProfileAvatarLink'

export default function ProblemsPage() {
  const { data: problems, isLoading, error } = useProblems()
  const { data: mySubmissions = [] } = useMySubmissions()
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-8 py-8">
      <Crumbs
        current="Problems"
        rightSlot={<ProfileAvatarLink imageUrl={user?.imageUrl} name={user?.fullName || user?.username || 'Profile'} />}
      />

      <h1 className="text-2xl font-bold tracking-tight mb-1">All problems</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Single-function · judged on speed and length.
      </p>

      {isLoading && <p className="text-zinc-400">Loading problems…</p>}
      {error && <p className="text-rose-400">Failed to load problems.</p>}
      {problems && (
        <ProblemsTable problems={problems} mySubmissions={mySubmissions} />
      )}
    </div>
  )
}
