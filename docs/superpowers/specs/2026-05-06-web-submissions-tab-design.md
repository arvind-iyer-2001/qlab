# Web UI — My Submissions Tab Design Spec

> **Status:** approved 2026-05-06
> **Goal:** add a "My Submissions" tab to the web problem page that mirrors the equivalent tab in the VS Code extension, with one extension: clicking a past submission loads that code into the editor.

---

## Background

The VS Code extension shipped a "My Submissions" tab in Phase 4 (`Phase 4 — User Registration, Nicknames & Submission History` in `docs/implementation-summary.md`). It shows the signed-in user's history for the current problem with a star on the best correct submission. The web app currently has no equivalent — it has Description / Test / Submit / Solutions / Leaderboard.

The backend already exposes `GET /submissions/me?problem_id=…` (auth-gated, returns the calling user's submissions for one problem with `is_best` computed server-side). The web client (`web/lib/api.ts::getMySubmissions`) has a stub that hits this endpoint but does **not** currently pass `problem_id` — calling it as-is fails the FastAPI `Query(...)` requirement.

---

## Scope

In scope:
- New tab component `MySubmissionsTab` in `web/components/tabs/`
- Wiring it into the existing tab bar between Submit and Solutions
- Updating the backend response to include the submitted code
- Click-row-to-load flow with a dirty-editor confirm dialog
- Cache invalidation after a fresh submit

Out of scope:
- A global "all my submissions across all problems" view
- Re-running historical code from the table (user can load it then click Run / Submit themselves)
- Showing the actual `expected_output` / `actual_output` diff inline in the row (that lives on the Submit tab; covered separately in `FUTURE.md`)
- Mobile layout (deferred with the rest of the mobile work in `FUTURE.md`)

---

## Architecture

### Data flow

```
[MySubmissionsTab] --useMySubmissions(problemId)--> [TanStack Query]
                                                        |
                                                        v
                                                 GET /submissions/me?problem_id=N
                                                        |
                                                        v
                                                 [api/services/submissions.get_for_user]
                                                        |
                                                        v
                                                 [MongoDB submissions collection]

[row click] --loadCode(code)--> [problem page (parent)]
                                  |
                                  v
                          isDirty = currentCode !== starterCode
                                  |
                                  v
                          show confirm if dirty, then setEditorCode(code)
```

### Backend changes

**File:** `api/services/submissions.py`

Update the projection in `get_for_user` to include `code`:

```python
{
    "_id": 0,
    "problem_id": 1,
    "handle": 1,
    "status": 1,
    "timing_ms": 1,
    "char_count": 1,
    "language": 1,
    "submitted_at": 1,
    "code": 1,            # newly included
}
```

`error_msg` and `user_id` remain excluded — `error_msg` could be added later for inline error display, but is out of scope for this spec.

**File:** `api/models.py`

Add `code: str` to `MySubmissionEntry`:

```python
class MySubmissionEntry(BaseModel):
    problem_id: int
    handle: str
    status: SubmissionStatus
    timing_ms: Optional[int] = None
    char_count: Optional[int] = None
    language: Language
    submitted_at: str
    is_best: bool = False
    code: str
```

No router-level changes — `GET /submissions/me` already returns `list[MySubmissionEntry]`.

### Frontend changes

**File:** `web/lib/api.ts`

Update `MySubmissionEntry` interface to add `code: string`. Update `getMySubmissions` to require `problemId`:

```ts
getMySubmissions: (token: string | null, problemId: number) =>
  apiFetch<MySubmissionEntry[]>(`/submissions/me?problem_id=${problemId}`, token),
```

**File:** `web/hooks/useMySubmissions.ts` *(new)*

```ts
export function useMySubmissions(problemId: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['mySubmissions', problemId],
    queryFn: async () => api.getMySubmissions(await getToken(), problemId),
    enabled: !!problemId,
  })
}
```

(Pattern matches the existing `useLeaderboard` / `useProblem` hooks already in `web/hooks/`.)

**File:** `web/hooks/useSubmit.ts` *(modify existing)*

Add `onSuccess` to the submit mutation that invalidates the `mySubmissions` key for the current problem so the tab is fresh next time the user opens it.

**File:** `web/components/tabs/MySubmissionsTab.tsx` *(new)*

Props:
```ts
type Props = {
  problemId: number
  starterCode: string        // from problem.json starter
  currentCode: string        // current editor contents
  onLoadCode: (code: string) => void  // setter on parent
}
```

Renders a single `<table>`:

| Date | Status | Timing | Chars | Language | Best |
|---|---|---|---|---|---|
| 2026-05-06 14:32 | correct | 7 ms | 48 | q | ★ |

Status uses the same Tailwind color classes already defined for SubmitTab pills (correct → green, wrong → red, error/timeout → yellow). Rows are clickable; hover state highlights the row. Newest-first (no client-side sort needed — server returns in this order).

Empty state: a centered message — *"No submissions yet — submit your first solution to see it here."*
Loading state: matches the spinner pattern used by the other tabs.
Error state: matches the error pattern used by the other tabs.

**File:** `web/app/problems/[slug]/page.tsx` *(modify)*

- Import `MySubmissionsTab`.
- Insert between the Submit and Solutions tab triggers + panels.
- Pass `problemId`, `starterCode`, `currentCode`, and an `onLoadCode` callback that wraps the dirty-check / confirm flow.

### Click-to-load flow

The `onLoadCode` handler in `page.tsx`:

```ts
function handleLoadCode(code: string) {
  const isDirty = currentCode !== starterCode
  if (isDirty) {
    const ok = window.confirm('Replace current editor code with this submission?')
    if (!ok) return
  }
  setEditorCode(code)
}
```

Native `window.confirm` is acceptable for this scope — it matches platform conventions and avoids pulling in a modal component just for a yes/no question. If we add a styled confirm later, the call site is one line and trivial to swap.

After a successful load:
- The editor updates (CodeMirror is a controlled component — driven by `currentCode` state in the parent).
- No tab switch — user stays on the My Submissions tab. They can click Test or Submit when ready.

---

## Tab ordering

Final order in `web/app/problems/[slug]/page.tsx`:

1. Description
2. Test
3. Submit
4. **My Submissions** *(new)*
5. Solutions
6. Leaderboard

This places it adjacent to Submit so a user reaching for "did my submission show up?" finds it next door.

---

## Edge cases

| Case | Behavior |
|---|---|
| User not signed in | Tab still renders, but `useMySubmissions` returns 401 → show the same "sign in to see your submissions" empty state used elsewhere |
| User signed in, zero submissions for this problem | Empty state copy as defined above |
| User clicks a row whose `code` is empty/missing | Treat as no-op; should never happen post-projection-fix but guard with `if (!code) return` |
| User has the same code in editor as the row they clicked (no diff) | Still shows confirm if dirty against starter — fine, low cost |
| User submits while on the My Submissions tab | TanStack Query invalidation refetches; new row appears at the top |
| Token expires mid-session | `apiFetch` returns 401, caught by the existing token-expired handler used elsewhere on the page |

---

## Testing

No frontend test harness exists yet (per `FUTURE.md`), so verification is manual + via existing pytest:

- **Backend:** add a pytest case in `tests/test_submissions.py` (or similar — create if missing) confirming that `GET /submissions/me` now includes `code` in the response when authenticated.
- **Frontend (manual):**
  1. Solve `p001` two different ways. Confirm both show in the tab, newest first, with `is_best` ★ on the faster.
  2. Click an old row with the editor untouched — code loads silently.
  3. Modify the editor, click an old row — confirm dialog appears; cancel keeps editor as-is; confirm replaces it.
  4. Submit a new solution — switch back to My Submissions, confirm the new row appears at the top.
  5. Sign out + visit the tab — empty / sign-in state renders.

---

## Files touched

| File | Action |
|---|---|
| `api/services/submissions.py` | Add `code` to projection in `get_for_user` |
| `api/models.py` | Add `code: str` to `MySubmissionEntry` |
| `web/lib/api.ts` | Add `code` to `MySubmissionEntry`; require `problemId` in `getMySubmissions` |
| `web/hooks/useMySubmissions.ts` | **New** — TanStack Query hook |
| `web/hooks/useSubmit.ts` | Invalidate `mySubmissions` query key on submit success |
| `web/components/tabs/MySubmissionsTab.tsx` | **New** — table component |
| `web/app/problems/[slug]/page.tsx` | Wire up new tab + `onLoadCode` callback |
| `tests/test_submissions.py` | **New or amend** — assert `code` field present on `/submissions/me` |
