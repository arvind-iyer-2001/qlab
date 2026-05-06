'use client'
import { useAuth } from '@clerk/nextjs'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTest() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken()
      return api.execute(code, token)
    },
  })
}
