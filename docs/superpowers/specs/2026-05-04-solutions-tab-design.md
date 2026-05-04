# Solutions / Editorial Tab — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  

---

## Overview

Add a **Solutions** tab to the qLab VS Code problem panel. The tab exposes four tiers of content — hints, editorial, reference solution, and community top solutions — progressively unlocked based on the user's submission history. Content gates are enforced server-side so locked material never reaches the client until earned.

---

## Content Tiers

| Tier | Content | Always unlocked? |
|---|---|---|
| Hints | Text hints from `problem.json`, revealed one at a time on click | After first attempt |
| Editorial | Markdown + Mermaid walkthrough of the approach, authored by Claude Code | Configurable per problem |
| Reference | Canonical `reference.q` solution | Configurable per problem |
| Community | Top-ranked correct submissions with code | Configurable per problem |

---

## Unlock Rules

### Tab-level lock
The Solutions tab is inaccessible (greyed out with 🔒) until the user has submitted at least one attempt on that problem. Clicking it before any attempt shows a lock overlay with a "Go to Submit →" CTA.

### Per-tier unlock config
Each problem carries a `solutions_config` object in its `problem.json` (seeded into MongoDB). Hints are always unlocked after the first attempt and have no config entry. Each other tier has:

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
}
```

- `gate: "attempts"` — unlocks after `attempts_required` total submissions (any status). Setting `attempts_required: 1` means the tier is visible as soon as the tab itself is accessible.
- `gate: "correct"` — unlocks only after at least one correct submission

Locked sub-tabs show a specific message: `"Submit N more attempt(s) to unlock"` or `"Solve the problem to unlock"`.

---

## Data Model

### `problems` collection (additions)

```json
{
  "editorial": "## Approach\nThe key insight is **matrix indexing**...\n\n```mermaid\nflowchart LR\n  A[x] --> B[rank check]\n  A --> C[suit check]\n```",
  "solutions_config": {
    "editorial":  { "gate": "attempts", "attempts_required": 3 },
    "reference":  { "gate": "correct" },
    "community":  { "gate": "attempts", "attempts_required": 1 }
  }
}
```

`editorial` is a markdown string authored by Claude Code when creating or updating a problem. It is seeded via `scripts/seed_problems.py` alongside the existing problem fields.

### `hint_reveals` collection (new)

Tracks how many hints each user has revealed per problem.

```
{ clerk_user_id: str, problem_id: int, revealed_count: int }
```

Unique index on `(clerk_user_id, problem_id)`. Upserted on each reveal request.

---

## API

### `GET /problems/:slug/solutions`
**Auth required.** Returns the solutions content filtered by what the authenticated user has unlocked.

**Server logic:**
1. Fetch the problem document (for `solutions_config`, `hints`, `editorial`, `reference_solution`)
2. Fetch `hint_reveals` for this user/problem pair (default `revealed_count = 0`)
3. Count user's total attempts and whether any are correct via `submissions` collection
4. For each tier, check the unlock rule; return content if unlocked, lock descriptor if not

**Response:**
```json
{
  "hints_revealed": 2,
  "hints_total": 5,
  "hints": ["Cards are just strings…", "x[1][;0] extracts all ranks…"],
  "editorial": { "locked": true, "reason": "Submit 1 more attempt to unlock" },
  "reference":  { "locked": true, "reason": "Solve the problem to unlock" },
  "community":  [
    { "rank": 1, "handle": "qwizard", "timing_ms": 12, "char_count": 43, "language": "q", "code": "func:{…}" }
  ]
}
```

When unlocked, `editorial` is `{ "locked": false, "content": "<markdown>" }` and `reference` is `{ "locked": false, "code": "<q source>" }`. Locked tiers never include content. `community` returns the top 5 entries by rank when unlocked, empty array when locked.

### `POST /problems/:slug/solutions/hints/reveal`
**Auth required.** Increments `hint_reveals.revealed_count` by 1 (up to `hints_total`). Returns the newly revealed hint text.

```json
{ "hint": "Use `any` to check if any element of a boolean list is true.", "revealed": 3, "total": 5 }
```

If `revealed_count` is already at `hints_total`, returns 400.

---

## VS Code Extension

### `api.ts` additions
```ts
getSolutions(slug: string): Promise<SolutionsResponse | 'expired'>
revealNextHint(slug: string): Promise<HintRevealResult | 'expired' | null>
```

`getSolutions` uses the existing `authGet`. `revealNextHint` requires a new `authPost` private method (same pattern as `authGet` but for POST with no body). Both return `'expired'` on 401/403, triggering the existing re-sign-in prompt.

### `ProblemPanel.ts` changes

**Tab bar:** Add a sixth tab `Solutions` after `Community`. When the server response indicates no attempts yet, render the lock overlay instead of sub-tabs. The overlay includes a "Go to Submit" button that switches the active tab to `submit`.

**Sub-tab structure inside Solutions:**
- `Hints` — always the default active sub-tab; shows revealed hints as left-bordered blocks; "Reveal next hint (N remaining)" button triggers `revealNextHint`; button hidden when all hints revealed
- `Editorial` — renders markdown (stripped to plain text for now; Mermaid diagrams shown as a code block) or locked state
- `Reference` — shows q code in a `<pre>` block or locked state
- `Community` — table of top submissions with code blocks, same style as the leaderboard table

**Loading:** Solutions content is fetched when the Solutions tab is first clicked (lazy, same pattern as My Submissions). A spinner is shown until the response arrives.

---

## Seeding

`scripts/seed_problems.py` is updated to seed `editorial` and `solutions_config` from `problem.json` using `$set` (not `$setOnInsert`) so re-running the seeder updates editorial content as it is authored. The `reference.q` file content is read from disk at seed time and stored in the `problems` document as a `reference_solution` field so the API can return it without a filesystem read at request time.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| User not in MongoDB (webhook race) | `GET /solutions` returns 404; extension shows "Sign in to view solutions" |
| All hints already revealed | Reveal button hidden; "All hints revealed" label shown |
| `editorial` field missing on problem | Editorial sub-tab shows "No editorial yet for this problem" |
| `reference_solution` missing | Reference sub-tab shows "Reference solution not available" |
| Network error on solutions fetch | Sub-tab shows "Could not load — tap to retry" with a retry button |

---

## Out of Scope

- Mermaid diagram rendering (editorial shown as markdown plain text for now)
- Admin UI for authoring editorials
- User opt-in for sharing community solutions (top leaderboard entries shown automatically)
- Nickname-gating or time-gating (only attempt-count and correct-submission gates)
