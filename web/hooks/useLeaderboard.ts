'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useLeaderboard(slug: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['leaderboard', slug],
    queryFn: async () => {
      const token = await getToken()
      return api.getLeaderboard(slug, token)
    },
    enabled: !!slug,
  })
}
