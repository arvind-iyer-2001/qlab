# Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current auth-walled `/` with a public home screen that serves as both a marketing landing page and a signed-in dashboard, using Aceternity UI components on top of the existing Next.js 14 / Tailwind 3 / Clerk / TanStack Query stack.

**Architecture:** Single Next.js App Router page at `web/app/page.tsx` that composes six section components from `web/components/home/`. Public route (added to Clerk middleware). Auth-aware hero variant via Clerk's `useUser()` + existing `useMySubmissions()` hook. All other dynamic data is stubbed in `web/lib/home-stubs.ts` with `TODO(home-stubs):` comments naming the future API endpoints.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind 3, Clerk, TanStack Query, Aceternity UI (installed via shadcn CLI), Framer Motion (`motion`).

**Spec:** `docs/superpowers/specs/2026-05-06-home-screen-design.md` · **Brief:** `docs/spec/home-screen-brief.md`.

**Working directory note:** All commands assume `cd web/` unless explicitly noted. Use `bun` if available, otherwise `npm`. Examples below show `npx`/`npm` for portability.

---

### Task 1: Project setup — shadcn, Aceternity registry, deps, middleware

**Files:**
- Create: `web/components.json`
- Create: `web/lib/utils.ts`
- Modify: `web/package.json` (via `npm install`)
- Modify: `web/tailwind.config.ts` (or `.js`) — add `darkMode: 'class'` if missing
- Modify: `web/middleware.ts` — add `/` to public routes

- [ ] **Step 1: Inspect current Tailwind config**

Run: `cat web/tailwind.config.* 2>/dev/null`
Expected: existing tailwind config printed. Note whether `darkMode` is set and whether `content` includes `./components/**/*.{ts,tsx}`. Update later in this task only if missing.

- [ ] **Step 2: Install runtime dependencies**

```bash
cd web
npm install motion clsx tailwind-merge
```

Expected: `motion`, `clsx`, `tailwind-merge` added under `dependencies` in `web/package.json`.

- [ ] **Step 3: Create the cn utility at `web/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Create `web/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "registries": {
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json"
  }
}
```

If `web/tailwind.config.ts` does not exist but `web/tailwind.config.js` does, change `"config"` to `"tailwind.config.js"`.

- [ ] **Step 5: Ensure Tailwind dark mode + content paths cover new dirs**

If `tailwind.config.*` lacks `darkMode: 'class'`, add it at the top of the export. If `content` does not already include `./components/**/*.{ts,tsx}` and `./lib/**/*.{ts,tsx}`, add them. Skip this step entirely if both are already present.

- [ ] **Step 6: Make `/` a public route**

Edit `web/middleware.ts`. Replace the line:

```typescript
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/auth(.*)', '/sign-out(.*)'])
```

with:

```typescript
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/auth(.*)', '/sign-out(.*)'])
```

- [ ] **Step 7: Boot the dev server and verify `/` no longer redirects**

```bash
cd web
npm run dev
```

In another terminal: `curl -sI http://localhost:9091/ | head -3`
Expected: `HTTP/1.1 404` (page doesn't exist yet) — *not* a 307 redirect to `/sign-in`. A 404 confirms middleware now lets `/` through. Stop the dev server (Ctrl+C) when done.

- [ ] **Step 8: Commit**

```bash
git add web/components.json web/lib/utils.ts web/package.json web/package-lock.json web/middleware.ts web/tailwind.config.*
git commit -m "feat(web): scaffold shadcn + Aceternity registry, open / route"
```

---

### Task 2: Install Aceternity components

**Files:**
- Create (via CLI): `web/components/ui/background-beams.tsx`
- Create (via CLI): `web/components/ui/typewriter-effect.tsx`
- Create (via CLI): `web/components/ui/moving-border.tsx`
- Create (via CLI): `web/components/ui/infinite-moving-cards.tsx`
- Create (via CLI): `web/components/ui/bento-grid.tsx`
- Create (via CLI): `web/components/ui/hover-effect.tsx`

- [ ] **Step 1: Install all six components**

```bash
cd web
npx shadcn@latest add @aceternity/background-beams \
                     @aceternity/typewriter-effect \
                     @aceternity/moving-border \
                     @aceternity/infinite-moving-cards \
                     @aceternity/bento-grid \
                     @aceternity/card-hover-effect
```

Each should land in `web/components/ui/`. Accept overwrites if prompted (none should exist).

- [ ] **Step 2: Verify the files exist and contain the `"use client"` directive**

```bash
ls web/components/ui/
head -1 web/components/ui/background-beams.tsx
```

Expected: all six files present; first line of each is `"use client";`.

- [ ] **Step 3: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors. If components reference an absent dep, install it (most commonly `@tabler/icons-react` for some Aceternity components — install only if `tsc` complains).

- [ ] **Step 4: Commit**

```bash
git add web/components/ui/ web/package.json web/package-lock.json
git commit -m "feat(web): add Aceternity UI primitives"
```

---

### Task 3: Stub data file

**Files:**
- Create: `web/lib/home-stubs.ts`

- [ ] **Step 1: Create the stubs file**

```typescript
// Static seed data for the home screen. Replace each section with a real API
// call before any external launch — every TODO comment names the endpoint.

export interface TickerEntry {
  handle: string
  problem_title: string
  problem_slug: string
  difficulty: 'easy' | 'medium' | 'hard'
  timing_ms: number
  char_count: number
}

// TODO(home-stubs): replace with GET /submissions/recent?limit=20
export const RECENT_SUBMISSIONS: TickerEntry[] = [
  { handle: 'kx_arvind', problem_title: 'Same Same', problem_slug: 'same-same', difficulty: 'easy', timing_ms: 2, char_count: 14 },
  { handle: 'qmaster',   problem_title: 'Trade Bucket', problem_slug: 'trade-bucket', difficulty: 'medium', timing_ms: 47, char_count: 38 },
  { handle: 'tickwiz',   problem_title: 'Window Sum', problem_slug: 'window-sum', difficulty: 'easy', timing_ms: 5, char_count: 22 },
  { handle: 'vectorize', problem_title: 'Asof Join Lite', problem_slug: 'asof-join-lite', difficulty: 'hard', timing_ms: 112, char_count: 61 },
  { handle: 'kdb_owl',   problem_title: 'Same Same', problem_slug: 'same-same', difficulty: 'easy', timing_ms: 3, char_count: 16 },
  { handle: 'qmaster',   problem_title: 'Window Sum', problem_slug: 'window-sum', difficulty: 'easy', timing_ms: 4, char_count: 19 },
  { handle: 'tickwiz',   problem_title: 'Asof Join Lite', problem_slug: 'asof-join-lite', difficulty: 'hard', timing_ms: 138, char_count: 72 },
  { handle: 'kx_arvind', problem_title: 'Trade Bucket', problem_slug: 'trade-bucket', difficulty: 'medium', timing_ms: 51, char_count: 41 },
]

export interface PillarStat {
  label: string
  value: string
}

// TODO(home-stubs): replace problems_count with GET /problems (length)
//                   replace top_handle/top_time with GET /leaderboard/global?limit=1
export const PILLAR_STATS: { problems: PillarStat; capstones: PillarStat; leaderboard: PillarStat } = {
  problems:    { label: 'problems',     value: '12' },
  capstones:   { label: 'coming soon',  value: '5 tracks' },
  leaderboard: { label: 'top time',     value: '@kx_arvind · 2ms' },
}

export interface LeaderRow {
  rank: number
  handle: string
  best_time_ms: number
  solved: number
}

// TODO(home-stubs): replace with GET /leaderboard/global?limit=5
export const TOP_FIVE: LeaderRow[] = [
  { rank: 1, handle: 'kx_arvind', best_time_ms: 2,  solved: 12 },
  { rank: 2, handle: 'qmaster',   best_time_ms: 3,  solved: 11 },
  { rank: 3, handle: 'tickwiz',   best_time_ms: 4,  solved: 10 },
  { rank: 4, handle: 'vectorize', best_time_ms: 5,  solved: 9 },
  { rank: 5, handle: 'kdb_owl',   best_time_ms: 5,  solved: 8 },
]

// TODO(home-stubs): replace with GET /stats/weekly (count of correct submissions, last 7 days)
export const WEEKLY_SOLVES: number = 187

export interface CapstoneTrack {
  title: string
  teaser: string
}

export const CAPSTONE_TRACKS: CapstoneTrack[] = [
  { title: 'Partitioned Databases',  teaser: 'A year of trade ticks. .Q.dpft. Time-window queries under a memory budget.' },
  { title: 'Joins Under Load',       teaser: 'aj, wj, lj over realistic order/quote books. Correctness and throughput judged.' },
  { title: 'Tickerplant Scenarios',  teaser: 'Feed handlers, RDB → HDB end-of-day, recovery semantics.' },
  { title: 'Optimization Gauntlet',  teaser: 'Beat a slow reference query by 5× without changing the schema.' },
  { title: 'Schema Design',          teaser: 'Open-ended. Judged against a battery of analytical queries.' },
]
```

- [ ] **Step 2: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/lib/home-stubs.ts
git commit -m "feat(web): home-screen stub data with API-contract TODOs"
```

---

### Task 4: Hero component (auth-aware)

**Files:**
- Create: `web/components/home/Hero.tsx`

- [ ] **Step 1: Create `web/components/home/Hero.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { TypewriterEffect } from '@/components/ui/typewriter-effect'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { useProblems } from '@/hooks/useProblems'

const WORDS = [
  { text: 'Solve.' },
  { text: 'Optimize.' },
  { text: 'Compete.', className: 'text-emerald-400' },
]

export function Hero() {
  const { isSignedIn, user } = useUser()
  const { data: submissions } = useMySubmissions()
  const { data: problems } = useProblems()

  const handle = user?.username ?? user?.firstName ?? 'qLab User'
  const lastSubmission = submissions?.[0]
  const lastSlug = lastSubmission
    ? problems?.find((p) => p.id === lastSubmission.problem_id)?.slug
    : undefined

  const correctIds = new Set(
    (submissions ?? []).filter((s) => s.status === 'correct').map((s) => s.problem_id),
  )
  const solvedCount = correctIds.size
  const bestTimeMs = (submissions ?? [])
    .filter((s) => s.status === 'correct' && typeof s.timing_ms === 'number')
    .reduce<number | null>((min, s) => (min == null ? s.timing_ms! : Math.min(min, s.timing_ms!)), null)

  return (
    <section className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden bg-zinc-950">
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="font-mono text-sm text-emerald-400/80 mb-4">qLab — the q dojo</p>
        <TypewriterEffect words={WORDS} className="!text-5xl md:!text-7xl !text-white" />
        {isSignedIn && solvedCount > 0 ? (
          <p className="mt-6 font-mono text-sm text-zinc-400">
            Welcome back, <span className="text-white">@{handle}</span> ·
            {' '}{solvedCount} solved{bestTimeMs != null ? ` · best ${bestTimeMs}ms` : ''}
          </p>
        ) : (
          <p className="mt-6 text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto">
            Leetcode for q today. A capstone gauntlet tomorrow. Real q process,
            instant judging, leaderboards measured in milliseconds and characters.
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {isSignedIn && lastSlug ? (
            <>
              <Link
                href={`/problems/${lastSlug}`}
                className="px-6 py-3 rounded-md bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition"
              >
                Continue → {lastSlug}
              </Link>
              <Link
                href="/problems"
                className="px-6 py-3 rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition"
              >
                Browse all problems
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/problems"
                className="px-6 py-3 rounded-md bg-emerald-500 text-zinc-950 font-medium hover:bg-emerald-400 transition"
              >
                Start solving
              </Link>
              <a
                href="#capstones"
                className="px-6 py-3 rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition"
              >
                Try a capstone <span className="ml-2 text-xs text-zinc-500">coming soon</span>
              </a>
            </>
          )}
        </div>
      </div>
      <BackgroundBeams />
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors. If `TypewriterEffect`'s prop name differs (some Aceternity versions use `<TypewriterEffectSmooth />` or accept `cursorClassName`), open the generated file at `web/components/ui/typewriter-effect.tsx` and adapt the call signature accordingly.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/Hero.tsx
git commit -m "feat(web): home hero with auth-aware variant"
```

---

### Task 5: Live ticker

**Files:**
- Create: `web/components/home/LiveTicker.tsx`

- [ ] **Step 1: Create `web/components/home/LiveTicker.tsx`**

```tsx
'use client'

import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { RECENT_SUBMISSIONS } from '@/lib/home-stubs'

const DIFFICULTY_COLOR: Record<'easy' | 'medium' | 'hard', string> = {
  easy:   'text-emerald-400',
  medium: 'text-amber-400',
  hard:   'text-rose-400',
}

export function LiveTicker() {
  const items = RECENT_SUBMISSIONS.map((entry) => ({
    quote: (
      <span className="font-mono text-sm">
        <span className="text-white">@{entry.handle}</span>
        {' solved '}
        <span className="text-white">{entry.problem_title}</span>
        {' in '}
        <span className="text-emerald-400">{entry.timing_ms}ms</span>
        {' / '}
        <span className="text-zinc-400">{entry.char_count} chars</span>
        {' · '}
        <span className={DIFFICULTY_COLOR[entry.difficulty]}>{entry.difficulty}</span>
      </span>
    ),
    name: '',
    title: '',
  }))

  return (
    <section className="bg-zinc-950 py-10 border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 mb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          live · recent solves
        </p>
      </div>
      <InfiniteMovingCards items={items as any} direction="left" speed="slow" pauseOnHover />
    </section>
  )
}
```

The `as any` cast covers the case where the Aceternity `InfiniteMovingCards` typing expects `quote: string`. If the generated type permits `ReactNode`, drop the cast.

- [ ] **Step 2: Type-check**

```bash
cd web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/LiveTicker.tsx
git commit -m "feat(web): live submissions ticker"
```

---

### Task 6: Three-pillar bento

**Files:**
- Create: `web/components/home/ThreePillars.tsx`

- [ ] **Step 1: Create `web/components/home/ThreePillars.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { PILLAR_STATS } from '@/lib/home-stubs'

export function ThreePillars() {
  return (
    <section className="bg-zinc-950 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Three ways to train
        </h2>
        <p className="text-zinc-400 mb-10 max-w-xl">
          Short problems for sharp reps. Capstones for the long game. A leaderboard that keeps score.
        </p>
        <BentoGrid className="md:grid-cols-3">
          <BentoGridItem
            title="Problems"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.problems.value} {PILLAR_STATS.problems.label} · single-function · judged on speed and length
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-emerald-900/40 to-zinc-900" />}
            className="md:col-span-1"
          />
          <BentoGridItem
            title="Capstones"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.capstones.value} · partitioned DBs, joins under load, tickerplant
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-amber-900/40 to-zinc-900" />}
            className="md:col-span-1"
          />
          <BentoGridItem
            title="Leaderboard"
            description={
              <span className="font-mono text-sm text-zinc-300">
                {PILLAR_STATS.leaderboard.value} · public, per-problem, milliseconds matter
              </span>
            }
            header={<div className="h-32 rounded-md bg-gradient-to-br from-violet-900/40 to-zinc-900" />}
            className="md:col-span-1"
          />
        </BentoGrid>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/problems" className="text-emerald-400 font-mono text-sm hover:text-emerald-300">
            → browse problems
          </Link>
          <a href="#capstones" className="text-zinc-500 font-mono text-sm hover:text-zinc-300">
            → preview capstones
          </a>
        </div>
      </div>
    </section>
  )
}
```

If `BentoGridItem` from the generated file requires different prop names (some versions use `icon` instead of `header`, or omit `description`), open `web/components/ui/bento-grid.tsx` and align the props. Keep the visual intent (title + description + a colored block).

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/ThreePillars.tsx
git commit -m "feat(web): three-pillar bento (Problems · Capstones · Leaderboard)"
```

---

### Task 7: Capstone preview

**Files:**
- Create: `web/components/home/CapstonePreview.tsx`

- [ ] **Step 1: Create `web/components/home/CapstonePreview.tsx`**

```tsx
'use client'

import { HoverEffect } from '@/components/ui/card-hover-effect'
import { CAPSTONE_TRACKS } from '@/lib/home-stubs'

export function CapstonePreview() {
  const items = CAPSTONE_TRACKS.map((t) => ({
    title: t.title,
    description: (
      <span>
        {t.teaser}
        <br />
        <span className="font-mono text-xs text-emerald-400/70 mt-2 inline-block">// coming soon</span>
      </span>
    ),
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
        <HoverEffect items={items as any} />
      </div>
    </section>
  )
}
```

The Aceternity `HoverEffect` typically renders an `<a>` for each card. We pass `link: '#'` because cards are non-interactive — the visual effect is the value here, not navigation.

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/CapstonePreview.tsx
git commit -m "feat(web): capstone preview cards (coming soon)"
```

---

### Task 8: Leaderboard strip + weekly count

**Files:**
- Create: `web/components/home/LeaderboardStrip.tsx`

- [ ] **Step 1: Create `web/components/home/LeaderboardStrip.tsx`**

```tsx
'use client'

import { TOP_FIVE, WEEKLY_SOLVES } from '@/lib/home-stubs'

export function LeaderboardStrip() {
  return (
    <section className="bg-zinc-950 py-20 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-4">
            global · top 5
          </p>
          <ul className="font-mono text-sm divide-y divide-zinc-900">
            {TOP_FIVE.map((row) => (
              <li key={row.rank} className="flex items-center justify-between py-3">
                <span className="text-zinc-500 w-8">#{row.rank}</span>
                <span className="text-white flex-1">@{row.handle}</span>
                <span className="text-emerald-400 w-20 text-right">{row.best_time_ms}ms</span>
                <span className="text-zinc-400 w-24 text-right">{row.solved} solved</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-2">
            this week
          </p>
          <p className="text-6xl md:text-7xl font-bold text-white tabular-nums">
            {WEEKLY_SOLVES}
          </p>
          <p className="text-zinc-400 text-sm mt-2">correct submissions</p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/LeaderboardStrip.tsx
git commit -m "feat(web): top-5 + weekly solves strip"
```

---

### Task 9: Interviewer CTA (env-gated)

**Files:**
- Create: `web/components/home/InterviewerCTA.tsx`

- [ ] **Step 1: Create `web/components/home/InterviewerCTA.tsx`**

```tsx
export function InterviewerCTA() {
  if (process.env.NEXT_PUBLIC_QLAB_HIRING_CTA !== '1') return null
  return (
    <section className="bg-zinc-950 py-16 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-2">
            for interviewers
          </p>
          <p className="text-xl text-white">Hiring q devs?</p>
          <p className="text-zinc-400 text-sm mt-1">
            Build a private problem set and shortlist from real solve times.
          </p>
        </div>
        <a
          href="mailto:hello@qlab.dev?subject=Private%20problem%20set"
          className="px-5 py-3 rounded-md border border-zinc-700 text-zinc-200 font-mono text-sm hover:border-zinc-500 transition"
        >
          Get in touch →
        </a>
      </div>
    </section>
  )
}
```

This component renders nothing unless `NEXT_PUBLIC_QLAB_HIRING_CTA=1` is set at build time. Default off.

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/components/home/InterviewerCTA.tsx
git commit -m "feat(web): env-gated interviewer CTA"
```

---

### Task 10: Wire up the home page

**Files:**
- Create: `web/app/page.tsx`

- [ ] **Step 1: Create `web/app/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check the whole web app**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build to surface any prod-only issues**

```bash
cd web && npm run build
```

Expected: build succeeds. If a component complains about being used in a Server Component, ensure `'use client'` is at the top of every file in `web/components/home/` *except* `InterviewerCTA.tsx` (which is a pure server-renderable function that reads `process.env`).

- [ ] **Step 4: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat(web): assemble home screen at /"
```

---

### Task 11: Manual smoke test

**Files:** none changed in this task — verification only.

- [ ] **Step 1: Run the API and web in parallel**

In one terminal: `./start.sh` (boots q + FastAPI as documented in CLAUDE.md).
In another: `cd web && npm run dev`.

- [ ] **Step 2: Verify the signed-out experience**

Open `http://localhost:9091/` in an incognito window. Confirm:
- The hero renders with the "Solve. Optimize. Compete." typewriter, the marketing subhead, and the `Start solving` / `Try a capstone` CTAs.
- Clicking `Start solving` navigates to `/problems` (which will then redirect to sign-in — expected).
- The ticker scrolls horizontally and pauses on hover.
- The bento grid, capstone cards, top-5 strip, and weekly count all render.
- `BackgroundBeams` animates without console errors. Check browser devtools → no red errors.

- [ ] **Step 3: Verify the signed-in experience**

Sign in via `/sign-in`, then navigate to `/`. Confirm:
- The hero subhead changes to `Welcome back, @{handle} · {N} solved` (or shows the marketing subhead if the user has zero correct submissions yet).
- If the user has any submissions, the primary CTA reads `Continue → {slug}` and routes to `/problems/{slug}`. If not, it falls back to `Start solving`.
- The rest of the page (ticker, bento, capstones, top-5) is identical to the signed-out view.

- [ ] **Step 4: Verify no regressions on existing routes**

Click through to `/problems`, `/profile`, sign out, sign back in. Each should behave as before — middleware change only adds `/` to the public matcher, nothing else.

- [ ] **Step 5: Note follow-ups**

If the build is on `next/dynamic` (no SSR) for `BackgroundBeams` because LCP regressed, capture that in a follow-up note in the PR description. No code change in this task — just a verification.

- [ ] **Step 6: Final commit if any tweaks were needed**

If steps 2–4 surfaced layout or copy issues that warrant a fix, fix them, commit:

```bash
git add web/
git commit -m "fix(web): home-screen smoke-test polish"
```

If nothing needs fixing, this task is just verification — no commit.
