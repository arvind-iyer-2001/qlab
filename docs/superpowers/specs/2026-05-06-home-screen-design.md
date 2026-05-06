# Home Screen Design

A real landing page at `/` that captures the spirit of qLab — competitive q practice — instead of forcing every visitor into the problems list (or, today, into a sign-in redirect). Companion brief at `docs/spec/home-screen-brief.md`.

## Goal

Replace the current state where `/` 404s for signed-out users and is auth-walled for everyone else, with a single home page that:

- Sells qLab to first-time visitors (signed out): tagline, capstones teaser, social proof
- Acts as a dashboard for regulars (signed in): "Continue where you left off" card + the same competitive proof points
- Establishes the visual tone — terminal/competitive, monospaced accents, dark first

## Routing & auth

- `/` becomes a **public** route — added to `isPublicRoute` matcher in `web/middleware.ts`
- Same component renders for both auth states; an inline conditional (`useUser()` from `@clerk/nextjs`) toggles the resume card and personalized hero copy
- Signed-out users hitting protected routes still bounce to sign-in as today
- Existing `/problems`, `/profile` etc. unchanged

## Page sections (top to bottom)

1. **Hero**
   - Headline: typewriter/flip-words effect cycling `"Solve."` → `"Optimize."` → `"Compete."` over a static `qLab — the q dojo` line. Aceternity `TypewriterEffect` or `FlipWords`.
   - Subhead: one paragraph from the brief (`Leetcode for q today, capstone gauntlet tomorrow`).
   - Background: Aceternity `BackgroundBeams` (dark, low-distraction).
   - Two CTAs:
     - Primary `Start solving` → `/problems` (Aceternity `MovingBorder` button)
     - Secondary `Try a capstone` → smooth-scroll to capstones section, badge `coming soon`
   - **Signed-in variant:** headline becomes `Welcome back, @{handle}`. Subhead replaced with stat strip — `{n} solved · rank #{rank} · best time {ms}ms`. CTAs become `Continue → /problems/{lastSlug}` + `Browse all problems`.
2. **Live submissions ticker**
   - Aceternity `InfiniteMovingCards`, horizontal scroll, slow speed, pause on hover.
   - Each card: `@handle solved {Problem Title} in {ms}ms / {chars} chars`, monospaced, subtle difficulty pill.
   - **Phase 1 data:** static seed array of ~10 plausible entries, hardcoded in the component. Comment with the future API contract: `GET /submissions/recent?limit=20`.
3. **Three pillars (Bento)**
   - Aceternity `BentoGrid` with three cells of equal height:
     - **Problems** — count badge (`{n} problems`), one-liner, link → `/problems`
     - **Capstones** — `coming soon` badge, one-liner about partitioned-DB / joins / tickerplant scenarios
     - **Leaderboard** — current top-1 `@handle` and their best time, link → `/leaderboard` (route doesn't exist yet — link points to `#` with TODO)
   - Counts stub-fed for now; comment with API contract.
4. **Capstone preview**
   - Aceternity `HoverEffect` (card grid).
   - Five fixed cards: Partitioned DBs, Joins Under Load, Tickerplant, Optimization Gauntlet, Schema Design.
   - Each card: title, one-line scenario teaser from the brief, monospace `// coming soon` footer.
   - Cards are non-interactive (no link).
5. **Top-5 strip + weekly count**
   - Compact horizontal strip: 5 leaderboard rows + a single big-number `{n} solved this week`.
   - Stub data; same API-contract comment pattern.
6. **Footer-style "For interviewers" CTA**
   - Single line + ghost button. Marked TODO/low-priority in code; renders nothing if a `NEXT_PUBLIC_QLAB_HIRING_CTA` env flag is unset. Default off in this pass.

## File layout (`web/`)

```
web/
  app/
    page.tsx                          # NEW — home route
  components/
    home/
      Hero.tsx                        # NEW — hero with auth-aware variant
      LiveTicker.tsx                  # NEW — InfiniteMovingCards wrapper
      ThreePillars.tsx                # NEW — BentoGrid
      CapstonePreview.tsx             # NEW — HoverEffect grid
      LeaderboardStrip.tsx            # NEW — top-5 + weekly count
      InterviewerCTA.tsx              # NEW — env-gated
    ui/                               # Aceternity components live here
      background-beams.tsx            # NEW — installed via shadcn
      typewriter-effect.tsx           # NEW
      moving-border.tsx               # NEW
      infinite-moving-cards.tsx       # NEW
      bento-grid.tsx                  # NEW
      hover-effect.tsx                # NEW
  middleware.ts                       # MODIFIED — add `/` to public routes
  lib/
    home-stubs.ts                     # NEW — static seed data + API-contract comments
```

`web/components/home/*.tsx` are page-specific; Aceternity primitives go in `web/components/ui/` per the shadcn convention.

## Data flow

- All home-page data is static for this pass — sourced from `web/lib/home-stubs.ts`.
- The signed-in variant of the hero needs `handle`, `solved_count`, and `last_slug`. `handle` from `GET /users/me`. `last_slug` and `solved_count` derived client-side from `GET /submissions/me`: most-recent submission's `problem_slug`, and `len(unique problem_ids where status == "correct")` respectively. Both via existing TanStack Query hooks; no new endpoints in this pass.
  - `rank` is omitted in this pass (no global leaderboard endpoint yet) — hero stat strip shows just `solved` and `best time`.
  - If `/submissions/me` returns empty, the resume card degrades to the signed-out hero copy with the user's `@handle` substituted.
- Future endpoints (commented in stubs file): `GET /submissions/recent`, `GET /leaderboard/global`, `GET /stats/weekly`.

## Visual / tone notes

- Inherits the existing Tailwind config and Clerk theme. Dark mode default (matches the rest of the site).
- Use the existing project monospaced stack for code-flavored elements (handles, problem titles in ticker, char counts). No new font asset.
- Avoid emoji — terminal-flavored brief is explicit on this.

## Out of scope

- Real `/leaderboard` page (link points to `#` with TODO).
- Real recent-submissions, weekly-count, global-leaderboard endpoints.
- Capstone backend work (entirely future scope, captured in `FUTURE.md` and brief).
- Mobile-first polish — desktop-first this pass; layout collapses gracefully (single column under `md`), but no narrow-viewport hero.
- Interviewer CTA UI/copy beyond the env-gated stub.

## Testing

- Visual smoke test in browser: load `/` signed-out, then signed-in, confirm both variants render and CTAs route correctly.
- No automated tests — this is a content/layout change with no business logic. (Existing tests around `/problems`, `/submissions/me` cover the data the hero pulls.)

## Risks / open items

- Aceternity components pull in `motion` (~40KB gzipped). Acceptable for a marketing route but worth tracking; no other route on the site uses Framer Motion today.
- `BackgroundBeams` is canvas-heavy on first paint. If the LCP regresses noticeably, swap for `AuroraBackground` (lighter) or load via `next/dynamic` with `ssr: false`.
- Hardcoded stub data must be removed before any external launch. Each stub site has a `// TODO(home-stubs):` comment with the future API shape.
