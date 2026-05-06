'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMySubmissions() {
  const { getToken, isSignedIn } = useAuth()
  return useQuery({
    queryKey: ['mySubmissions'],
    queryFn: async () => {
      const token = await getToken()
      return api.getMySubmissions(token)
    },
    enabled: !!isSignedIn,
  })
}
