'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMyRanks() {
  const { getToken, isSignedIn } = useAuth()
  return useQuery({
    queryKey: ['myRanks'],
    queryFn: async () => {
      const token = await getToken()
      return api.getMyRanks(token)
    },
    enabled: !!isSignedIn,
  })
}
