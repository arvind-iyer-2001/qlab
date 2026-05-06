import { Hero } from '@/components/home/Hero'
import { LiveTicker } from '@/components/home/LiveTicker'
import { ThreePillars } from '@/components/home/ThreePillars'
import { CapstonePreview } from '@/components/home/CapstonePreview'
import { LeaderboardStrip } from '@/components/home/LeaderboardStrip'
import { InterviewerCTA } from '@/components/home/InterviewerCTA'

export default function Home() {
  return (
    <main className="bg-zinc-950 text-white">
      <Hero />
      <LiveTicker />
      <ThreePillars />
      <CapstonePreview />
      <LeaderboardStrip />
      <InterviewerCTA />
    </main>
  )
}
