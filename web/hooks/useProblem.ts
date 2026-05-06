'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useProblem(slug: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['problem', slug],
    queryFn: async () => {
      const token = await getToken()
      return api.getProblem(slug, token)
    },
    enabled: !!slug,
  })
}
