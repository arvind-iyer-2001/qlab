'use client'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { OnboardingGate } from '@/components/OnboardingGate'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <html lang="en" className="dark">
          <body>
            <OnboardingGate />
            {children}
          </body>
        </html>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
