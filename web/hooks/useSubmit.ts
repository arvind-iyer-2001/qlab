'use client'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Language } from '@/lib/api'

export function useSubmit(slug: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { problem_id: number; code: string; language?: Language }) => {
      const token = await getToken()
      return api.submit(payload, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solutions', slug] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard', slug] })
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] })
    },
  })
}
