# Web My Submissions Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "My Submissions" tab to the web problem page (between Submit and Solutions) that lists the signed-in user's past submissions for the current problem, and lets them click a row to load that code into the editor.

**Architecture:** Backend exposes `code` on the existing `GET /submissions/me` response (auth-already-gated to "your own submissions"). A new `MySubmissionsTab` component reads via TanStack Query and calls a parent `onLoadCode` callback to push code into the editor; parent shows a confirm dialog if the editor is dirty.

**Tech Stack:** FastAPI + motor + Pydantic on the backend. Next.js 14 + TanStack Query v5 + CodeMirror 6 + Clerk on the frontend.

**Reference spec:** `docs/superpowers/specs/2026-05-06-web-submissions-tab-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `api/services/submissions.py` | modify `get_for_user` | Include `code` in MongoDB projection |
| `api/models.py` | modify `MySubmissionEntry` | Add `code: str` field |
| `tests/test_submissions_me.py` | **create** | Pytest case asserting `/submissions/me` includes `code` |
| `web/lib/api.ts` | modify | Add `code` to `MySubmissionEntry`, require `problemId` in `getMySubmissions` |
| `web/hooks/useMySubmissions.ts` | modify | Take `problemId`, key query by it |
| `web/components/tabs/MySubmissionsTab.tsx` | **create** | Table component |
| `web/components/ProblemLayout.tsx` | modify | Add new tab to bar, wire `onLoadCode` callback with dirty-check + confirm |

`web/hooks/useSubmit.ts` already invalidates `['mySubmissions']` on success — no change needed there.

---

## Task 1: Backend — add `code` to `MySubmissionEntry` model

**Files:**
- Modify: `api/models.py:139-147`

- [ ] **Step 1.1: Add `code: str` to the model**

Replace the existing `MySubmissionEntry` (currently lines 139–147 of `api/models.py`) with:

```python
class MySubmissionEntry(BaseModel):
    problem_id: int
    handle: str
    status: SubmissionStatus
    timing_ms: Optional[int] = None
    char_count: Optional[int] = None
    language: Language
    submitted_at: str
    is_best: bool
    code: str
```

Only line added is `code: str` at the end. Leave the surrounding classes alone.

- [ ] **Step 1.2: Run pytest to confirm nothing else broke**

Run: `pytest -q`
Expected: all existing tests still pass (the model change is additive; consumers ignore unknown fields).

---

## Task 2: Backend — include `code` in MongoDB projection

**Files:**
- Modify: `api/services/submissions.py` (the `get_for_user` function)

- [ ] **Step 2.1: Read the current projection**

Open `api/services/submissions.py` and locate `get_for_user`. The projection dict currently lists fields like `_id: 0`, `problem_id: 1`, `handle: 1`, `status: 1`, `timing_ms: 1`, `char_count: 1`, `language: 1`, `submitted_at: 1`.

- [ ] **Step 2.2: Add `code: 1` to the projection**

In the projection dict inside `db.submissions.find(...)`, add a new line `"code": 1,` next to the other allowed fields. Do not add `error_msg` or `user_id` — those stay excluded.

- [ ] **Step 2.3: Confirm `is_best: True` will pass through**

`is_best` is computed at runtime on each row and the model now has `code: str` plus `is_best: bool`, so Pydantic will keep both. No code change here, just a sanity check that the existing post-processing loop (`r["is_best"] = (i == best_idx)`) still runs after the projection update. If the function changed shape, fix accordingly.

- [ ] **Step 2.4: Commit Tasks 1 + 2 together**

```bash
git add api/models.py api/services/submissions.py
git commit -m "feat(api): expose submission code on GET /submissions/me

Adds code field to MySubmissionEntry and includes it in the MongoDB
projection used by get_for_user. Endpoint is already auth-gated to
the calling user's own submissions, so no additional access control
needed. Powers the upcoming web My Submissions tab's click-to-load
behavior."
```

---

## Task 3: Backend test — assert `code` is present on `/submissions/me`

**Files:**
- Create: `tests/test_submissions_me.py`

- [ ] **Step 3.1: Write the failing test**

Create `tests/test_submissions_me.py` with:

```python
import time
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from fastapi.testclient import TestClient
import jwt


def make_rsa_key_pair():
    pk = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    return pk, pk.public_key()


def make_token(private_key, payload: dict) -> str:
    return jwt.encode(payload, private_key, algorithm="RS256")


def make_signing_key_mock(public_key):
    m = MagicMock()
    m.key = public_key
    return m


class _AsyncCursor:
    def __init__(self, rows):
        self._rows = rows

    def sort(self, *_a, **_kw):
        return self

    def limit(self, *_a, **_kw):
        return self

    async def to_list(self, length=None):
        return list(self._rows)


def _make_db_with_one_submission():
    submission = {
        "problem_id": 1,
        "handle": "tester",
        "status": "correct",
        "timing_ms": 5,
        "char_count": 42,
        "language": "q",
        "submitted_at": datetime.now(timezone.utc),
        "code": "func:{x*2}",
    }
    db = MagicMock()
    db.submissions.find = MagicMock(return_value=_AsyncCursor([submission]))
    return db


@pytest.mark.asyncio
async def test_submissions_me_returns_code_field():
    """GET /submissions/me must include the `code` field so the web My Submissions
    tab can load past code back into the editor."""
    private_key, public_key = make_rsa_key_pair()
    token = make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) + 3600})

    from api.main import app
    from api.deps import get_db

    db = _make_db_with_one_submission()
    app.dependency_overrides[get_db] = lambda: db

    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)

    try:
        with patch("api.services.auth._get_jwks_client", return_value=mock_jwks):
            with TestClient(app) as client:
                resp = client.get(
                    "/submissions/me?problem_id=1",
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert isinstance(body, list) and len(body) == 1
        assert body[0]["code"] == "func:{x*2}"
    finally:
        app.dependency_overrides.pop(get_db, None)
```

- [ ] **Step 3.2: Run the test to confirm it passes**

Run: `pytest tests/test_submissions_me.py -v`
Expected: PASS. (If it fails because the API still excludes `code`, go back and finish Task 2.)

- [ ] **Step 3.3: Commit**

```bash
git add tests/test_submissions_me.py
git commit -m "test(api): assert /submissions/me returns code field"
```

---

## Task 4: Frontend — update `MySubmissionEntry` interface and `getMySubmissions` signature

**Files:**
- Modify: `web/lib/api.ts:52-61` (interface), `web/lib/api.ts:154-155` (api method)

- [ ] **Step 4.1: Add `code` to the interface**

Replace the existing `MySubmissionEntry` interface (currently lines 52–61) with:

```ts
export interface MySubmissionEntry {
  problem_id: number
  handle: string
  status: SubmissionStatus
  timing_ms?: number
  char_count?: number
  language: Language
  submitted_at: string
  is_best: boolean
  code: string
}
```

- [ ] **Step 4.2: Update `getMySubmissions` to require `problemId`**

Replace the existing definition (currently at lines 154–155):

```ts
  getMySubmissions: (token: string | null) =>
    apiFetch<MySubmissionEntry[]>('/submissions/me', token),
```

with:

```ts
  getMySubmissions: (token: string | null, problemId: number) =>
    apiFetch<MySubmissionEntry[]>(`/submissions/me?problem_id=${problemId}`, token),
```

- [ ] **Step 4.3: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: failures in any caller that still passes a single argument to `getMySubmissions`. We'll fix the only caller in Task 5.

---

## Task 5: Frontend — update `useMySubmissions` hook to take `problemId`

**Files:**
- Modify: `web/hooks/useMySubmissions.ts`

- [ ] **Step 5.1: Replace the file body**

Replace the entire contents of `web/hooks/useMySubmissions.ts` with:

```ts
'use client'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMySubmissions(problemId: number) {
  const { getToken, isSignedIn } = useAuth()
  return useQuery({
    queryKey: ['mySubmissions', problemId],
    queryFn: async () => {
      const token = await getToken()
      return api.getMySubmissions(token, problemId)
    },
    enabled: !!isSignedIn && Number.isInteger(problemId) && problemId > 0,
  })
}
```

The query key is now `['mySubmissions', problemId]` so different problems don't share a cache entry. The existing `useSubmit` invalidates `['mySubmissions']` (no problemId) which is a prefix match — TanStack Query v5 invalidates anything whose key starts with that array, so no change needed in `useSubmit`.

- [ ] **Step 5.2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: PASS (the interface and hook now agree). Any callers — there should be none yet — would surface here.

- [ ] **Step 5.3: Commit Tasks 4 + 5 together**

```bash
git add web/lib/api.ts web/hooks/useMySubmissions.ts
git commit -m "feat(web): add code + problemId to my-submissions API surface

Updates MySubmissionEntry interface and getMySubmissions client to
match the backend (now returns code, requires problem_id query
param). Hook keys queries by problemId so per-problem caches stay
separate."
```

---

## Task 6: Frontend — create `MySubmissionsTab` component

**Files:**
- Create: `web/components/tabs/MySubmissionsTab.tsx`

- [ ] **Step 6.1: Write the component**

Create `web/components/tabs/MySubmissionsTab.tsx` with:

```tsx
'use client'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { MySubmissionEntry } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  correct: '#00b8a3',
  wrong: '#ef4743',
  error: '#ef4743',
  error_runtime: '#ef4743',
  error_parse: '#ef4743',
  timeout: '#ffc01e',
}

const STATUS_LABELS: Record<string, string> = {
  correct: 'Accepted',
  wrong: 'Wrong Answer',
  error: 'Runtime Error',
  error_runtime: 'Runtime Error',
  error_parse: 'Parse Error',
  timeout: 'Time Limit Exceeded',
}

interface Props {
  problemId: number
  onLoadCode: (code: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function MySubmissionsTab({ problemId, onLoadCode }: Props) {
  const { data, isLoading, error } = useMySubmissions(problemId)

  if (isLoading) {
    return (
      <div style={{ padding: '20px', color: '#aba9b0' }}>Loading…</div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          margin: '20px',
          background: '#2a1a1a',
          border: '1px solid #ef4743',
          borderRadius: '6px',
          padding: '12px',
          color: '#ef4743',
          fontSize: '13px',
          fontFamily: 'monospace',
        }}
      >
        {(error as Error).message}
      </div>
    )
  }

  const rows: MySubmissionEntry[] = data ?? []

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          color: '#aba9b0',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        No submissions yet — submit your first solution to see it here.
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          color: '#eff1f6',
        }}
      >
        <thead>
          <tr style={{ color: '#aba9b0', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Date</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Status</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Timing</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Chars</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Lang</th>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid #3a3a3a' }}>Best</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={() => {
                if (r.code) onLoadCode(r.code)
              }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = '#252525'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
              }}
            >
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>{formatDate(r.submitted_at)}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', color: STATUS_COLORS[r.status] ?? '#eff1f6' }}>
                {STATUS_LABELS[r.status] ?? r.status}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>
                {r.timing_ms != null ? `${r.timing_ms} ms` : '—'}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>
                {r.char_count != null ? r.char_count : '—'}
              </td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a' }}>{r.language}</td>
              <td style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', color: '#ffd700' }}>
                {r.is_best ? '★' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6.2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6.3: Commit**

```bash
git add web/components/tabs/MySubmissionsTab.tsx
git commit -m "feat(web): add MySubmissionsTab component

Renders the user's per-problem submission history as a clickable
table. Status colors match SubmitTab. Click a row to invoke
onLoadCode with the submission's source. Empty / loading / error
states match other tabs."
```

---

## Task 7: Frontend — wire the tab into `ProblemLayout` with dirty-check confirm

**Files:**
- Modify: `web/components/ProblemLayout.tsx`

- [ ] **Step 7.1: Add the import + tab type entry**

At the top of `web/components/ProblemLayout.tsx`, add the import:

```ts
import { MySubmissionsTab } from '@/components/tabs/MySubmissionsTab'
```

Replace the `Tab` type and `TABS` const (currently lines 11–12):

```ts
type Tab = 'description' | 'test' | 'submit' | 'mysubmissions' | 'solutions' | 'leaderboard'
const TABS: Tab[] = ['description', 'test', 'submit', 'mysubmissions', 'solutions', 'leaderboard']
```

- [ ] **Step 7.2: Add a tab label override**

Tab buttons currently use `textTransform: 'capitalize'` to render the tab key as a label. `mysubmissions` would render as "Mysubmissions". Add a label map just above the `return` statement in `ProblemLayout`:

```ts
const TAB_LABELS: Record<Tab, string> = {
  description: 'Description',
  test: 'Test',
  submit: 'Submit',
  mysubmissions: 'My Submissions',
  solutions: 'Solutions',
  leaderboard: 'Leaderboard',
}
```

Then in the tab `<button>` mapping, replace `{tab}` with `{TAB_LABELS[tab]}` and remove `textTransform: 'capitalize'` from the `style` block.

- [ ] **Step 7.3: Add the dirty-check + load handler**

Inside `ProblemLayout`, just below `const [code, setCode] = useState(...)`, add:

```ts
const initialCode = starterCode(problem.slug)

function handleLoadCode(loaded: string) {
  const isDirty = code !== initialCode
  if (isDirty) {
    const ok = window.confirm('Replace current editor code with this submission?')
    if (!ok) return
  }
  setCode(loaded)
}
```

Note: `starterCode(problem.slug)` is deterministic given the slug, so capturing it once outside `useState` is safe. We compare against this captured starter — not against the current `code` state's *initial* value, but the formula that produced it. Same string either way.

- [ ] **Step 7.4: Render the tab body**

In the tab content section (currently lines 56–60), insert `MySubmissionsTab` between Submit and Solutions:

```tsx
{activeTab === 'description' && <DescriptionTab problem={problem} />}
{activeTab === 'test' && <TestTab problem={problem} code={code} />}
{activeTab === 'submit' && <SubmitTab problem={problem} code={code} />}
{activeTab === 'mysubmissions' && (
  <MySubmissionsTab problemId={problem.id} onLoadCode={handleLoadCode} />
)}
{activeTab === 'solutions' && <SolutionsTab slug={problem.slug} />}
{activeTab === 'leaderboard' && <LeaderboardTab slug={problem.slug} />}
```

- [ ] **Step 7.5: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: PASS. If `problem.id` errors, confirm the `ProblemDetail` type in `web/lib/api.ts` includes `id: number` (it should — used by `useSubmit` already).

- [ ] **Step 7.6: Commit**

```bash
git add web/components/ProblemLayout.tsx
git commit -m "feat(web): wire MySubmissionsTab into problem layout

Adds the tab between Submit and Solutions. Click-row-to-load goes
through a dirty-editor confirm dialog so users don't lose work in
progress. Tab label map lets us show 'My Submissions' instead of
the capitalized key."
```

---

## Task 8: Manual smoke test

No automated frontend test harness exists yet (per `FUTURE.md`). Verify by hand against the running stack.

- [ ] **Step 8.1: Start the stack and the web app**

```bash
./start.sh                                              # api on 8000, notebook q on 5001
(cd web && npm run dev)                                 # web on 9091
```

Sign in via `http://localhost:9091`. Open `p001` (or any seeded problem).

- [ ] **Step 8.2: Empty state**

Open My Submissions on a problem you have never solved. Expect: *"No submissions yet — submit your first solution to see it here."*

- [ ] **Step 8.3: First submission appears**

Submit a correct solution from the Submit tab. Switch to My Submissions. Expect one row with `Accepted`, a timing, char count, `q`, and `★`.

- [ ] **Step 8.4: Best-row star reshuffles**

Submit a slower correct solution (e.g. wrap the body in a `do[` to inflate timing). Expect the new row at the top, the original row keeps the ★, and the new row has no ★.

- [ ] **Step 8.5: Wrong submission renders red**

Submit `func:{"NO"}` (wrong for most problems). Expect a `Wrong Answer` row at the top in red, no ★.

- [ ] **Step 8.6: Click-to-load — clean editor**

Reload the page (editor returns to starter). Click any past row. Expect: editor immediately fills with that submission's code, no confirm dialog.

- [ ] **Step 8.7: Click-to-load — dirty editor**

Type something into the editor (different from the starter). Click a past row. Expect: a confirm dialog "Replace current editor code with this submission?". Cancel → editor unchanged. Accept → editor replaced.

- [ ] **Step 8.8: Tab order**

Confirm visually: Description / Test / Submit / **My Submissions** / Solutions / Leaderboard.

- [ ] **Step 8.9: Auth-gated**

Sign out. Open the same problem. The My Submissions tab should render the empty state (the hook is `enabled` only when signed in), and the network panel should show no `/submissions/me` request.

If any step fails, capture the failure mode, fix the cause, and re-run from Step 8.1.

---

## Self-Review Checklist (already run)

- **Spec coverage:** every spec section maps to a task. Backend projection → Task 2. Model field → Task 1. API client + hook → Tasks 4–5. Tab component → Task 6. Tab placement + dirty-check flow → Task 7. Pytest case → Task 3. Manual checks → Task 8.
- **Placeholders:** none.
- **Naming consistency:** the Tab key is `mysubmissions` everywhere; the React import is `MySubmissionsTab`; the query key is `['mySubmissions', problemId]` (camelCase to match other hooks); the model field is `code`. Confirmed identical across tasks.
- **Files referenced exist where the plan says to modify them.** Confirmed during planning.
