import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './Providers'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
