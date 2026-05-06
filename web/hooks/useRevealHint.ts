'use client'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useRevealHint(slug: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.revealHint(slug, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solutions', slug] })
    },
  })
}
