'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useGlobalLeaderboard(limit = 5) {
  return useQuery({
    queryKey: ['globalLeaderboard', limit],
    queryFn: () => api.getGlobalLeaderboard(limit),
    staleTime: 60_000,
  })
}

export function useWeeklyStats() {
  return useQuery({
    queryKey: ['weeklyStats'],
    queryFn: () => api.getWeeklyStats(),
    staleTime: 60_000,
  })
}
