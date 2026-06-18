# Graph Report - qlab  (2026-06-18)

## Corpus Check
- 123 files · ~85,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1394 nodes · 2004 edges · 104 communities (92 shown, 12 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 151 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d67d8d87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 99|Community 99]]

## God Nodes (most connected - your core abstractions)
1. `QLabApi` - 25 edges
2. `Web My Submissions Tab Implementation Plan` - 21 edges
3. `ProblemPanel` - 20 edges
4. `cn()` - 18 edges
5. `Solutions / Editorial Tab Implementation Plan` - 17 edges
6. `SolvedCache` - 16 edges
7. `qLab Web UI Implementation Plan` - 16 edges
8. `VS Code Problem Panel — React Webview Rewrite` - 16 edges
9. `compilerOptions` - 15 edges
10. `Web Theme Unification Implementation Plan` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Clerk Auth` --conceptually_related_to--> `activate`  [INFERRED]
  CLAUDE.md → vscode-extension/src/extension.ts
- `Clerk Auth` --references--> `uriHandler`  [EXTRACTED]
  CLAUDE.md → vscode-extension/src/extension.ts
- `Clerk Auth` --references--> `SignOut`  [EXTRACTED]
  CLAUDE.md → web/app/sign-out/page.tsx
- `Web My Submissions Tab (FUTURE)` --semantically_similar_to--> `Web My Submissions Tab Design Spec`  [INFERRED] [semantically similar]
  FUTURE.md → docs/superpowers/specs/2026-05-06-web-submissions-tab-design.md
- `SolutionsConfig` --calls--> `test_solutions_config_defaults()`  [INFERRED]
  api/models.py → tests/test_solutions.py

## Import Cycles
- 1-file cycle: `api/main.py -> api/main.py`

## Hyperedges (group relationships)
- **My Submissions Tab end-to-end stack** —  [EXTRACTED 1.00]
- **Click-to-load with dirty-check confirm** —  [EXTRACTED 1.00]
- **Plan-Spec-Roadmap alignment for web My Submissions** —  [EXTRACTED 1.00]

## Communities (104 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (3): ProblemDetail, isTabId(), ProblemPanel

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (29): MySubmissionEntry, AsyncIOMotorDatabase, AsyncIOMotorDatabase, AsyncIOMotorDatabase, AsyncIOMotorDatabase, get_global_leaderboard(), get_recent_submissions(), get_weekly_stats() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (50): esbuild.js build script, Option A: Split Files (Quick Win), Option B: esbuild + TypeScript Webview, Option C: React Webview (Full GitLens-style), ProblemPanel.ts god file (1131 lines), Template Literal Backtick Escaping Bug, VS Code Extension Structural Improvements, src/webview/panel.css (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (25): AsyncIOMotorDatabase, AsyncIOMotorDatabase, get_solutions(), reveal_hint(), compute_solutions(), _get_top_community(), increment_hint_reveals(), _is_unlocked() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (51): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, Approach, File changes, Local development, Part 1 — Populate the users collection via Clerk webhooks (+43 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (47): Auth & Users, Backend / API, Capstones (future scope, separate from home screen), Clerk Authentication, Content & Problems, Cross-cutting (web ↔ extension parity), Home Screen, Infrastructure & Quality (+39 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (47): activationEvents, categories, properties, title, contributes, commands, configuration, keybindings (+39 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): Architecture overview, Data path, Data shape, Edge cases, Error handling, Estimated size, Feature 1 — Solved markers in the sidebar, Feature 2 — Wrong-answer diff in the Submit tab (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (56): code_must_be_single_param(), code_must_define_func(), CommunitySolution, Difficulty, EditorialTier, Example, ExecuteRequest, ExecuteResponse (+48 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (35): get_db(), AsyncIOMotorDatabase, Request, health(), lifespan(), AsyncIOMotorDatabase, AsyncIOMotorDatabase, Request (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (4): formatDate(), Props, STATUS_COLORS, STATUS_LABELS

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (7): ProblemSummary, DIFF_COLORS, DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider, TreeNode

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (30): dependencies, autoprefixer, @clerk/nextjs, clsx, @codemirror/lang-python, @codemirror/theme-one-dark, motion, next (+22 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (7): changeTab(), handleLoadCode(), isTab(), onKey(), ProblemLayout(), starterCode(), tabStorageKey()

### Community 15 - "Community 15"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.57
Nodes (4): activate(), deactivate(), jwtIsExpired(), setSignedInContext()

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (26): attempts_required, gate, compare_unordered, concepts, difficulty, editorial, attempts_required, gate (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.05
Nodes (27): AuthCallback(), handleCallback(), ColumnProps, Footer(), LINKS, clerkAppearance, DIFF_COLORS, QLabUser (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.83
Nodes (3): addAnimation(), getDirection(), getSpeed()

### Community 21 - "Community 21"
Cohesion: 0.50
Nodes (4): CommunitySolution Pydantic model, EditorialTier Pydantic model, ReferenceTier Pydantic model, SolutionsResponse Pydantic model

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (26): Home(), CapstonePreview(), InterviewerCTA(), LeaderboardStrip(), ThreePillars(), useGlobalLeaderboard(), useWeeklyStats(), CAPSTONE_TRACKS (+18 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (26): 10. Visual style — match the web app, `App.tsx`, Build pipeline, Cleanup, Components, Error handling, Goal, High-level architecture (+18 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (9): Hero(), WORDS, useMySubmissions(), useProblems(), api, ProblemsPage(), MySubmissionsTab(), ProfileAvatarLink() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (14): apiFetch(), CommunitySolution, EditorialTier, Example, ExecuteResponse, GlobalLeaderRow, HintRevealResponse, LeaderboardEntry (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (21): CommunitySolution, EditorialTier, Example, ExecuteResult, HintRevealResult, LeaderboardEntry, ReferenceTier, SolutionsResponse (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 32 - "Community 32"
Cohesion: 0.47
Nodes (3): useProblem(), DIFF_COLORS, ProblemPage()

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (10): Props, Tab, TABS, useTest(), ProblemDetail, DescriptionTab(), DIFF_COLORS, Props (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (8): CodeEditor(), Props, useRevealHint(), useSolutions(), Props, SolutionsTab(), SUB_TABS, SubTab

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (11): DIFF_TEXT, Filter, FILTERS, ProblemsTable(), Props, useMyRanks(), Difficulty, MySubmissionEntry (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (7): useSubmit(), Language, SubmissionStatus, Props, STATUS_COLORS, STATUS_LABELS, SubmitTab()

### Community 37 - "Community 37"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.47
Nodes (3): useLeaderboard(), LeaderboardTab(), Props

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 40 - "Community 40"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (25): attempts_required, gate, concepts, difficulty, editorial, attempts_required, gate, examples (+17 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (21): Data model additions, Description tab: Examples fused in, Middleware, My Submissions tab, New endpoint: `GET /submissions/me`, New endpoint: `PATCH /users/me/nickname`, New endpoint: `POST /webhooks/clerk`, Overview (+13 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (18): API Reference (FastAPI at `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`), Color Palette (used throughout), File Map, Known Limitations, qLab Web UI Implementation Plan, Self-Review, Spec Coverage, Task 10: Create `ProblemLayout` component (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (18): Current codebase (what already exists — do not rewrite unless told), Decisions already made — do not re-litigate, Endpoints the VS Code extension calls, Environment variables (do not hardcode these), FastAPI / pykx, Hard constraints — always respect these, Phase 1 — Judge sandboxing (do this first, before anything goes public), Phase 2 — MongoDB + motor (replace kdb+ persistence) (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (18): API, `api.ts` additions, Content Tiers, Data Model, Error Handling, `GET /problems/:slug/solutions`, `hint_reveals` collection (new), Out of Scope (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (17): Parallel execution note, Task A1: Expand users service + add per-user submissions query, Task A2: Clerk webhook endpoint, Task A3: PATCH /users/me/nickname, Task A4: GET /submissions/me + fix handle resolution in POST /submissions, Task B1: Env var + middleware, Task B2: /profile/setup page, Task B3: Update /auth/callback to check nickname (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (15): Adding a problem, Architecture, Async constraint, Auth (Clerk), FastAPI, graphify, Judge pipeline, Key env vars (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.12
Nodes (15): File Structure, Out of scope reminder, Task 10: Migrate auth pages — sign-in / sign-up, Task 11: Migrate `/sign-out` and `/auth/callback`, Task 12: Cleanup — verify no legacy literals or tokens remain, Task 1: Swap design tokens, Task 2: Add `<Brand/>` primitive, Task 3: Add `<Crumbs/>` primitive (+7 more)

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (12): Adding a problem, Environment variables, Graphify, How it works, Prerequisites, qLab, Running, Setup (+4 more)

### Community 82 - "Community 82"
Cohesion: 0.13
Nodes (14): aliases, components, utils, registries, @aceternity, rsc, $schema, style (+6 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (12): Home Screen Implementation Plan, Task 10: Wire up the home page, Task 11: Manual smoke test, Task 1: Project setup — shadcn, Aceternity registry, deps, middleware, Task 2: Install Aceternity components, Task 3: Stub data file, Task 4: Hero component (auth-aware), Task 5: Live ticker (+4 more)

### Community 84 - "Community 84"
Cohesion: 0.15
Nodes (12): Auth, Color Tokens, Data Flow, Decisions Made, File Structure, Goal, New Dependencies, Out of Scope (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.15
Nodes (12): Architecture, Backend changes, Background, Click-to-load flow, Data flow, Edge cases, Files touched, Frontend changes (+4 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (12): 1. Token system, 2. Shared primitives — `web/components/ui/`, 3. Per-page changes, 4. Migration order, Decisions, Design, Goals, Non-goals (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.17
Nodes (11): Challenges, Challenges, Challenges, Implementation Summary, Known Gaps (deferred), Phase 2 — MongoDB Migration, Phase 3 — Clerk Authentication, Phase 4 — User Registration, Nicknames & Submission History (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.17
Nodes (11): `api.ts`, Architecture, Authentication Design, Component 1 — Next.js app (`web/`), Component 2 — FastAPI JWT verification (`api/`), Component 3 — VS Code extension, Data flow — sign-in, Data flow — submission (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, lib, module, outDir, rootDir, skipLibCheck, sourceMap (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.18
Nodes (10): Data flow, File layout (`web/`), Goal, Home Screen Design, Out of scope, Page sections (top to bottom), Risks / open items, Routing & auth (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (9): Audience, Positioning, qLab — Home-Screen Brief, Suggested home-screen sections, Tone for the home screen, What the home screen should *not* do, What this is, in one line, Where qLab is going (capstones — the differentiator) (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.60
Nodes (3): kill_port(), wait_for_port(), start.sh script

## Knowledge Gaps
- **628 isolated node(s):** `PreToolUse`, `Request`, `AsyncIOMotorDatabase`, `Request`, `AsyncIOMotorDatabase` (+623 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProfileSetupInner()` connect `Community 18` to `Community 51`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `QLabApi` connect `Community 51` to `Community 0`, `Community 12`, `Community 16`, `Community 92`, `Community 29`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `Request`, `AsyncIOMotorDatabase` to the rest of the system?**
  _639 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08597285067873303 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05411764705882353 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.05805515239477504 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.055272108843537414 - nodes in this community are weakly interconnected._