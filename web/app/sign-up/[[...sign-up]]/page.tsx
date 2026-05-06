import { SignUp } from '@clerk/nextjs'
import { Brand } from '@/components/ui/Brand'
import { clerkAppearance } from '@/lib/clerkAppearance'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-6 py-8">
      <Brand as="link" size="lg" />
      <SignUp appearance={clerkAppearance} />
    </div>
  )
}
