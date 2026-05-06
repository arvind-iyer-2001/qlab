'use client'

import { HoverEffect } from '@/components/ui/card-hover-effect'
import { CAPSTONE_TRACKS } from '@/lib/home-stubs'

export function CapstonePreview() {
  const items = CAPSTONE_TRACKS.map((t) => ({
    title: t.title,
    description: `${t.teaser}  // coming soon`,
    link: '#',
  }))

  return (
    <section id="capstones" className="bg-zinc-950 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400/80">
          capstones · coming soon
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-2">
          Beyond single functions
        </h2>
        <p className="text-zinc-400 mb-10 max-w-2xl">
          Multi-file scenarios that test what one-line problems can&apos;t reach. Partitioned databases, asof joins under load, end-of-day handoffs. Each capstone is a workspace, judged against a battery of queries.
        </p>
        <HoverEffect items={items} />
      </div>
    </section>
  )
}
