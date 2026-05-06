'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useSolutions(slug: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['solutions', slug],
    queryFn: async () => {
      const token = await getToken()
      return api.getSolutions(slug, token)
    },
    enabled: !!slug,
  })
}
