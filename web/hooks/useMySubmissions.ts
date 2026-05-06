'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMySubmissions(problemId?: number) {
  const { getToken, isSignedIn } = useAuth()
  return useQuery({
    queryKey: ['mySubmissions', problemId],
    queryFn: async () => {
      const token = await getToken()
      return api.getMySubmissions(token, problemId)
    },
    enabled: !!isSignedIn && (problemId == null || (Number.isInteger(problemId) && problemId > 0)),
  })
}
