import { Hero } from '@/components/home/Hero'
import { ThreePillars } from '@/components/home/ThreePillars'
import { CapstonePreview } from '@/components/home/CapstonePreview'
import { LeaderboardStrip } from '@/components/home/LeaderboardStrip'
import { InterviewerCTA } from '@/components/home/InterviewerCTA'
import { Footer } from '@/components/home/Footer'

export default function Home() {
  return (
    <main className="bg-zinc-950 text-white">
      <Hero />
      <ThreePillars />
      <CapstonePreview />
      <LeaderboardStrip />
      <InterviewerCTA />
      <Footer />
    </main>
  )
}
