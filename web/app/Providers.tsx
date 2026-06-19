'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { OnboardingGate } from '@/components/OnboardingGate'

// Client-only providers, split out so the root layout can stay a Server
// Component (server rendering, metadata export, no app-wide client bundle).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingGate />
      {children}
    </QueryClientProvider>
  )
}
