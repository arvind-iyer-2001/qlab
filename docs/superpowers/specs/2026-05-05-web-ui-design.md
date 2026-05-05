# qLab Web UI — Design Spec

**Date:** 2026-05-05  
**Status:** Approved

---

## Goal

Add a full problem-solving web UI to qLab so users can browse problems, write q solutions, test, submit, view leaderboard, and read solutions/editorial — all in the browser. Feature parity with the VS Code extension.

---

## Decisions Made

| Decision | Choice |
|---|---|
| App location | Extend existing `web/` — no new app |
| Source layout | `web/src/` (Next.js 14 `src/` convention) |
| Problem list | Filterable table with difficulty pills |
| Problem detail | Full-page split — description left, editor right |
| Code editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| Server state | TanStack Query v5 (`@tanstack/react-query`) |
| Styling | Tailwind CSS, dark mode, LeetCode color palette |
| Color scheme | LeetCode — `#1a1a1a` bg, `#ffa116` orange accent, `#00b8a3` easy, `#ffc01e` medium, `#ef4743` hard |

---

## Color Tokens

```
background:       #1a1a1a
panel:            #282828
border:           #3a3a3a
text-primary:     #eff1f6
text-secondary:   #aba9b0
text-muted:       #5a5a5a
accent:           #ffa116   (tabs, Submit button, operators)
easy:             #00b8a3
medium:           #ffc01e
hard:             #ef4743
code-bg:          #1e1e1e
```

---

## File Structure

```
web/
└── src/
    ├── app/
    │   ├── layout.tsx                  # add QueryClientProvider, Tailwind dark class
    │   ├── problems/
    │   │   ├── page.tsx                # filterable table (protected)
    │   │   └── [slug]/
    │   │       └── page.tsx            # split-view problem detail (protected)
    │   ├── sign-in/    (existing)
    │   ├── sign-up/    (existing)
    │   ├── auth/       (existing)
    │   ├── profile/    (existing)
    │   └── sign-out/   (existing)
    ├── components/
    │   ├── ProblemsTable.tsx           # filterable table, difficulty pills, solve status
    │   ├── ProblemLayout.tsx           # left/right split shell, tab bar
    │   ├── CodeEditor.tsx              # CodeMirror 6 wrapper, q syntax highlight
    │   └── tabs/
    │       ├── DescriptionTab.tsx      # narrative, input spec, examples, hints
    │       ├── TestTab.tsx             # editor + run output via /notebook/execute
    │       ├── SubmitTab.tsx           # editor + submit result via /submissions
    │       ├── SolutionsTab.tsx        # hints/editorial/reference/community sub-tabs
    │       └── LeaderboardTab.tsx      # top submissions table
    ├── lib/
    │   └── api.ts                      # typed fetch client, NEXT_PUBLIC_API_URL
    └── hooks/
        ├── useProblems.ts              # useQuery → GET /problems
        ├── useProblem.ts               # useQuery → GET /problems/:slug
        ├── useSolutions.ts             # useQuery → GET /problems/:slug/solutions
        ├── useLeaderboard.ts           # useQuery → GET /problems/:slug/leaderboard
        ├── useMySubmissions.ts         # useQuery → GET /submissions/me
        ├── useSubmit.ts                # useMutation → POST /submissions
        │                               # on success: invalidate solutions + leaderboard
        ├── useTest.ts                  # useMutation → POST /notebook/execute
        └── useRevealHint.ts            # useMutation → POST /problems/:slug/solutions/hints/reveal
```

---

## Pages

### `/problems` — Problem List

- Protected by Clerk middleware (redirect to `/sign-in` if unauthenticated)
- Difficulty filter pills: All / Easy / Medium / Hard
- Table columns: # · Title · Difficulty · Concepts · Solve Status
- Solve status: green ✓ with best timing if solved, `—` if not
- Clicking a row navigates to `/problems/[slug]`

### `/problems/[slug]` — Problem Detail

- Protected
- **Nav**: `qLab / Problems / <title>` breadcrumb + difficulty badge + user avatar
- **Tab bar** (orange active indicator): Description · Test · Submit · Solutions · Leaderboard
- **Left panel** (45% width): tab content — description, examples, hints
- **Right panel** (55%): CodeMirror 6 editor, always visible regardless of active tab
  - Editor persists across tab switches (state lifted to page level)
  - File header shows slug filename
  - Bottom bar: char count · Test button · Submit button (orange)
- **Test tab**: left panel shows test call + output from `/notebook/execute`
- **Submit tab**: left panel shows submission result (correct/wrong/error card)
- **Solutions tab**: mirrors VS Code extension — hints sub-tab, editorial, reference, community
- **Leaderboard tab**: ranked table, timing ms + char count + handle

---

## Data Flow

```
Component
  └── hook (TanStack Query)
        └── lib/api.ts (fetch + Clerk JWT header)
              └── FastAPI :8000
```

- `useAuth()` from `@clerk/nextjs` provides `getToken()` for authenticated requests
- `NEXT_PUBLIC_API_URL` env var (default `http://localhost:8000`)
- After successful submit: `invalidateQueries(['solutions', slug])` + `invalidateQueries(['leaderboard', slug])`
- After hint reveal: `invalidateQueries(['solutions', slug])`

---

## Auth

- Existing Clerk middleware in `web/src/middleware.ts` extended to protect `/problems` and `/problems/:slug`
- Token retrieved via `useAuth().getToken()` and passed as `Authorization: Bearer <token>`
- Unauthenticated API responses (401) surface as "Sign in to continue" UI state, not crashes

---

## New Dependencies

```json
"@tanstack/react-query": "^5",
"@uiw/react-codemirror": "^4",
"@codemirror/lang-python": "^6",
"tailwindcss": "^3",
"autoprefixer": "^10",
"postcss": "^8"
```

---

## Out of Scope

- Monaco Editor
- Mobile-specific layout (Tailwind responsive classes added but not a priority)
- Community forum tab (placeholder, same as extension)
- Dark/light theme toggle (dark only for now)
- Moving existing auth pages into `src/` (done as part of this work)
