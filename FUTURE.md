# qLab — Future Scope

Single source of truth for everything still to build, plus a record of what's been done. Both
the web app (`web/`) and the VS Code extension (`vscode-extension/`) are first-class clients;
parity between them is a long-term goal.

Completed items stay in this file (checked) so we don't re-propose them.

---

## Web App

The web app is the newer client. The split-view problem page (CodeMirror editor + tabbed panel)
was scaffolded in May 2026 with TanStack Query, Tailwind, and Clerk. Most polish work below
applies once the basic flows are wired up.

- [x] Filterable problem list (`/problems`) — difficulty + search filters
- [x] Problem detail split view (`/problems/[slug]`) — editor on the left, tabbed panel on the right
- [x] Description / Test / Submit / Solutions / Leaderboard tabs (component scaffolds)
- [x] CodeMirror 6 integration with Tailwind globals and TanStack Query hooks
- [x] Test tab handles q-level errors separately from HTTP errors
- [x] Wrong-answer diff in Submit tab — side-by-side view of `expected_output` vs `actual_output` when a submission fails
- [x] My Submissions tab on the web — same data the VS Code extension shows (`GET /submissions/me`)
- [x] Sidebar / list-page solved markers — checkmark on problems the signed-in user has solved, plus current leaderboard rank
- [x] Profile page beyond Clerk data — display MongoDB nickname, total solves, per-difficulty stats
- [ ] Global stats / leaderboard page — aggregate ranking across all problems
- [x] Keyboard shortcuts — Cmd/Ctrl+Enter to submit, Cmd/Ctrl+R for Run Test, Cmd/Ctrl+\ to toggle panel
- [x] Tab-state memory per slug — return to the same tab the user left on a problem
- [ ] Mobile / narrow-viewport layout — at minimum a read-only fallback (problem text + leaderboard)
- [x] Deep-link copy button — share a URL that opens the problem at a specific tab
- [x] Subtle "Leaderboard updated" notice after a correct submission

---

## Home Screen

A real landing page at `/` that captures the spirit of qLab — competitive q practice — instead of
dropping users straight into the problems list. Full brief at
`docs/spec/home-screen-brief.md`.

- [x] Hero with animated headline + dual CTA (Start solving · Capstones teaser)
- [~] Live submissions ticker — scrolling marquee of recent correct solves with timing/char count (cut from home; cards felt out of place. Backend `GET /submissions/recent` still available for a future terminal-style log)
- [x] Three-pillar bento: Problems · Capstones · Leaderboard
- [x] Capstone preview cards — partitioned DBs, joins under load, tickerplant, optimization, schema design (all "coming soon")
- [x] Top-5 global leaderboard strip + weekly solve count
- [x] "Hiring q devs?" interviewer CTA (future monetization hook, low priority) — env-gated via `NEXT_PUBLIC_QLAB_HIRING_CTA=1`

### Capstones (future scope, separate from home screen)

Multi-file scenarios that test what single-function problems can't. Each capstone is a workspace
with its own dataset and a battery of judged queries.

- [ ] Partitioned DBs — `.Q.dpft` a year of trade ticks, answer time-window queries under a memory budget
- [ ] Joins under load — `aj` / `wj` / `lj` over realistic order/quote books, judged on correctness *and* throughput
- [ ] Tickerplant scenarios — feed handlers, RDB → HDB end-of-day, recovery semantics
- [ ] Optimization gauntlets — beat a slow reference query by 5× without changing the schema
- [ ] Schema design challenges — open-ended, judged against a battery of analytical queries

---

## VS Code Extension

The extension was the original client and is still primary for many users. Items here split into
**polish** (small UX wins) and **structural** (the `ProblemPanel.ts` god-file refactor).

### Polish

- [x] My Submissions tab in panel — table with date, status, timing, chars, language, ★ on best correct (Phase 4)
- [x] Welcome prompt on first activation — gated on `globalState` so it fires once
- [x] `qlab.openProfile` command + sidebar icon
- [x] Server-side handle resolution — handle no longer asked for in the Submit tab
- [ ] Solved/attempted markers in sidebar — checkmark icon on `ProblemItem` keyed by `slug → status` in `globalState`
- [ ] Wrong-answer diff in Submit tab — same idea as web, render `expected_output` vs `actual_output` inline
- [ ] Keybinding for Run Test — `Ctrl+Shift+T` to complement `Ctrl+Shift+S` for Submit
- [ ] Tab-state memory per panel — remember last active tab per slug in `globalState`
- [ ] Copy deep-link button in panel header — writes `vscode://qlab.qlab/open?slug=…` to clipboard
- [ ] Auto-refresh leaderboard feedback — subtle notice on the Community tab after a correct submission
- [ ] Problem filter in sidebar — filter input as the problem count grows
- [ ] API health indicator in status bar — green/red from periodic `GET /health`
- [ ] Panel restore on restart — save open slugs to `workspaceState` and re-open on activation
- [ ] My Submissions tab auto-load on panel open — currently only fetches when clicked
- [ ] `qlab.signOut` command — clears `SecretStorage` without making the user dig into settings

### Structural refactor of `ProblemPanel.ts`

`ProblemPanel.ts` is currently ~1100 lines doing extension-host logic, HTML templating, CSS, and
webview JS in one file. The template-literal escaping has caused real bugs (the Solutions tab
backtick incident). Three options, in increasing scope:

- [ ] **Option A — Split files (1–2 hrs):** extract `panel.html`, `panel.css`, `panel.js` into
      `src/webview/`, load them via `webview.asWebviewUri`. `ProblemPanel.ts` shrinks to ~200 lines
      of pure host logic. Real syntax highlighting, no more backtick fragility.
- [ ] **Option B — esbuild + TypeScript webview (½ day):** builds on Option A. Two compilation
      targets — `tsc` for the host, `esbuild` for `src/webview/panel.ts`. Webview becomes typed
      TypeScript, shared message interfaces with the host, `--watch` mode, `script-src ${cspSource}`
      with no inline-script hack.
- [ ] **Option C — React webview (days):** revisit only if the panel grows substantially in
      interactivity. Vanilla JS is fast enough today.

Recommended path: Option A immediately, Option B as the follow-up.

---

## Backend / API

- [x] MongoDB migration (Phase 2) — `motor` async client, three service modules, seed script
- [x] Clerk JWT auth on `POST /submissions` and `GET /users/me`
- [x] `POST /webhooks/clerk` — Svix-verified user.created / user.updated upsert
- [x] `PATCH /users/me/nickname` — set leaderboard handle
- [x] `GET /submissions/me?problem_id=` — user's history with `is_best` flag
- [x] Server-side handle resolution on `POST /submissions`
- [x] `submission_id` returned in `SubmissionResponse` (May 2026)
- [x] Notebook execute supports multi-statement code (newlines → semicolons; May 2026)
- [x] `error_runtime` / `error_parse` admitted into `SubmissionStatus` enum — judge emits them; Python maps via the enum
- [x] Return `expected_output` and `actual_output` on **correct** submissions too — judge now emits sampled values on correct
- [x] `user.deleted` webhook handling — Svix-verified delete event removes the user document
- [x] Update-nickname flow (`PATCH` again) — inline edit on `/profile`, reuses existing endpoint
- [x] Nickname uniqueness enforcement — unique sparse index on `users.nickname`
- [x] MongoDB indexes on `users.clerk_user_id` and `submissions.{user_id, problem_id}` — created at startup in `main.py` lifespan
- [ ] Rate limiting on `POST /submissions` and `POST /notebook/execute` — abuse / runaway-loop protection
- [ ] Structured logging + request IDs — currently `print` / default uvicorn logs
- [ ] Long-lived Clerk JWT via Clerk dashboard template — current ~60s expiry forces re-auth more often than ideal

---

## Auth & Users

- [x] Clerk sign-in / sign-up / OAuth callback in web app
- [x] VS Code URI handler captures token into `SecretStorage`
- [x] Nickname registration flow (`/profile/setup`)
- [x] First-sign-in race handling (stub user upsert before nickname set)
- [x] Web `/profile` shows MongoDB nickname (not just Clerk data) — needs a `GET /users/me` call from web; supports inline edit
- [ ] `/auth/callback` checks `isSignedIn` explicitly — currently relies on middleware redirect
- [ ] `qlab.signOut` command in extension (covered above)
- [ ] `CLERK_SECRET_KEY` actually used — present in `.env` for future Clerk REST calls (avatar refresh, metadata)

---

## Content & Problems

- [x] Five seed problems (`p001`–`p005`)
- [x] Problem authoring schema — `problem.json` + `test_gen.q` + `reference.q` + `\S` seed
- [x] Hint authoring infrastructure (Solutions tab Hints tier) — design done in `docs/superpowers/specs/2026-05-04-solutions-tab-design.md`
- [x] K-language coexistence rule — K submissions must include a Q equivalent (per CLAUDE.md)
- [ ] More problems — five is the current count; the platform needs depth to be useful
- [ ] Problem-authoring CLI / scaffolder — `qlab new-problem <slug>` to generate the directory + boilerplate and run a seed
- [ ] Difficulty calibration — currently free-text; could be derived from solve rate / median timing
- [ ] Tags / topics on problems — beyond difficulty, e.g. `joins`, `aggregations`, `temporal`
- [ ] K-language judge mode — actually validate that K submissions have a Q equivalent rather than relying on the spec
- [ ] Editorial / reference solutions populated for every problem — Solutions tab tiers exist but content is sparse

---

## Infrastructure & Quality

- [x] Pytest suite for auth (5 tests passing)
- [x] Pytest suite for solutions service
- [x] graphify knowledge graph wired into the repo with `update` hook
- [ ] Frontend test harness — none today; Next.js + TanStack Query + CodeMirror is testable but no setup
- [ ] VS Code extension tests — currently no test runner configured
- [ ] CI — GitHub Actions running pytest + `tsc --noEmit` (web) + extension build
- [ ] Production deployment story — see `PRODUCTION.md` (last updated Apr 22, predates the web UI work and needs a refresh)
- [ ] Observability dashboard — submission throughput, judge latency, MongoDB query times
- [ ] `.env.example` parity — keep in sync as new env vars are added

---

## Cross-cutting (web ↔ extension parity)

These live in both client lists above but track them here too — losing parity is a frequent
bug source.

| Feature | Web | VS Code | Notes |
|---|---|---|---|
| Wrong-answer diff | [x] | [ ] | Web has side-by-side toggle; VS Code still TODO |
| Solved markers in problem list | [x] | [ ] | Web reads from `GET /submissions/me` and `/submissions/me/ranks`; VS Code from `globalState` cache |
| My Submissions view | [x] | [x] | Both clients have it |
| Tab-state memory | [x] | [ ] | Web stores per-slug in `localStorage` + URL `?tab=`; VS Code still TODO |
| Deep-link to problem | [x] | [ ] | Web has copy button on the panel header; extension TODO |
