'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useProblems() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['problems'],
    queryFn: async () => {
      const token = await getToken()
      return api.getProblems(token)
    },
  })
}
