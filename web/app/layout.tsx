import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'qLab',
  description: 'Competitive coding for kdb+/q developers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
