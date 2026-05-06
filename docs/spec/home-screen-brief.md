# qLab — Home-Screen Brief

## What this is, in one line

**The training ground for kdb+/q developers** — Leetcode for q today, a full capstone gauntlet tomorrow.

## Positioning

KX Academy teaches you q. qLab makes you *good* at q. Where Academy is curriculum (read, watch, follow along), qLab is the dojo: open problems, a real q process under the hood, instant judging, leaderboards measured in milliseconds and characters. The competitive feedback loop — `\t:1000` for speed, `-2+count string func` for terseness — is the whole point. Two devs solving the same problem produce visibly different code; that comparison is where learning compounds.

## Audience

- Junior q devs onboarding at a fund or vendor, looking for reps
- Mid-level kdb+ engineers who want to benchmark themselves against peers
- Interviewers building shortlists from the leaderboard
- Hobbyists / students discovering vector languages for the first time

## Where qLab is today

- 1-parameter, single-function problems judged on correctness → speed → code length
- Web client (CodeMirror split-view) + VS Code extension (native panel) — first-class parity
- Clerk auth, MongoDB-backed submissions, persistent leaderboards, community solutions
- Difficulty-tiered catalog grouped easy / medium / hard

## Where qLab is going (capstones — the differentiator)

Multi-file, multi-table **scenarios** that test the parts of q that single-function problems can't reach:

- **Partitioned databases** — load a year of trade ticks, write the right `.Q.dpft`, answer time-window queries under a memory budget
- **Joins under load** — `aj`, `wj`, `lj` over realistic order/quote books; correctness *and* throughput judged
- **Streaming / tickerplant scenarios** — feed handlers, RDB → HDB end-of-day, recovery semantics
- **Optimization gauntlets** — given a slow query, beat the reference by 5× without changing the schema
- **Schema design challenges** — open-ended; judged against a battery of analytical queries

Each capstone is a workspace, not a function. KX Academy gestures at these topics in lessons; qLab makes you *do* them, against a clock, with a public score.

## Tone for the home screen

Confident, terminal-flavored, slightly competitive. Think "Cracking the Coding Interview meets Bloomberg Terminal," not "learning platform with cartoon mascot." Monospaced accents, dark first, real q snippets visible somewhere above the fold. The leaderboard is a feature, not an afterthought — show live top times.

## Suggested home-screen sections

1. **Hero** — tagline, primary CTA "Start solving" → `/problems`, secondary "Try a capstone" → coming-soon teaser
2. **Live ticker** — recent correct submissions: `@handle solved Same Same in 2ms / 14 chars`. Reinforces the timing/golfing culture.
3. **Three pillars** — Problems · Capstones · Leaderboard, each with one line and an icon
4. **Capstone preview** — gated "coming soon" cards for partitioned-DB, joins-under-load, tickerplant scenarios
5. **Community proof** — top-5 global leaderboard, total problems solved this week
6. **For interviewers** — small CTA: "Hiring q devs? Build a private problem set" (future monetization hook)

## What the home screen should *not* do

- No tutorial-style "learn q in 5 minutes" framing — that's KX Academy's job
- No long-form marketing copy — q people read code, not paragraphs
- No fake testimonials before there's a real community to quote
