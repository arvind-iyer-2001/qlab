# User Registration, Nickname & My Submissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk webhook user population, per-user nickname setup, per-problem submission history with is_best flag, and related extension/web UI changes.

**Architecture:** Three parallel tracks (A: backend, B: web, C: extension). Tracks are independent — each can be executed simultaneously. Within each track, tasks are sequential. Track A changes the data layer; Tracks B and C degrade gracefully if the backend isn't yet ready (web shows API errors inline, extension shows "sign in" prompts).

**Tech Stack:** FastAPI + Motor + PyJWT + svix (backend); Next.js 14 App Router + `@clerk/nextjs` (web); TypeScript VS Code Extension API (extension)

---

## Parallel execution note

Dispatch one agent per track. Tracks A, B, and C can all start immediately — they touch different files and have no shared state.

---

## TRACK A — Backend

### Task A1: Expand users service + add per-user submissions query

**Files:**
- Modify: `api/requirements.txt`
- Modify: `api/services/users.py`
- Modify: `api/services/submissions.py`

- [ ] **Step 1: Add svix to `api/requirements.txt`**

Append after the `cryptography` line:
```
svix
```

- [ ] **Step 2: Replace `api/services/users.py`**

```python
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_by_clerk_id(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict | None:
    return await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})


async def upsert(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    display_name: str,
    email: str,
    avatar_url: str | None = None,
    username: str | None = None,
) -> None:
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {
            "$set": {
                "display_name": display_name,
                "email": email,
                "avatar_url": avatar_url,
                "username": username,
            },
            "$setOnInsert": {
                "clerk_user_id": clerk_user_id,
                "nickname": None,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )


async def set_nickname(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    nickname: str,
) -> None:
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {"$set": {"nickname": nickname}},
    )
```

- [ ] **Step 3: Append `get_for_user` to `api/services/submissions.py`**

Add at the end of the file:
```python


async def get_for_user(
    db: AsyncIOMotorDatabase,
    user_id: str,
    problem_id: int,
) -> list[dict]:
    from datetime import datetime
    cursor = (
        db.submissions.find(
            {"user_id": user_id, "problem_id": problem_id},
            {"_id": 0},
        )
        .sort("submitted_at", -1)
        .limit(100)
    )
    rows = await cursor.to_list(length=100)

    # Find best correct submission index (lowest timing_ms, then char_count)
    best_idx: int | None = None
    best_time: int | None = None
    best_chars: int | None = None
    for i, r in enumerate(rows):
        if r.get("status") == "correct":
            t = r.get("timing_ms") or 0
            c = r.get("char_count") or 0
            if best_idx is None or t < best_time or (t == best_time and c < best_chars):
                best_idx = i
                best_time = t
                best_chars = c

    for i, r in enumerate(rows):
        r["is_best"] = (i == best_idx)
        if isinstance(r.get("submitted_at"), datetime):
            r["submitted_at"] = r["submitted_at"].isoformat()
    return rows
```

- [ ] **Step 4: Commit**

```bash
git add api/requirements.txt api/services/users.py api/services/submissions.py
git commit -m "feat: expand users service with nickname/avatar fields, add per-user submission query"
```

---

### Task A2: Clerk webhook endpoint

**Files:**
- Create: `api/routers/webhooks.py`
- Modify: `api/main.py`
- Modify: `.env.example`

- [ ] **Step 1: Add env var to `.env.example`**

Append:
```
CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

- [ ] **Step 2: Create `api/routers/webhooks.py`**

```python
import os
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from svix.webhooks import Webhook, WebhookVerificationError

from deps import get_db
import services.users as users_svc

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="CLERK_WEBHOOK_SECRET not configured")

    body = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        payload = wh.verify(body, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = payload.get("type")
    data = payload.get("data", {})

    if event_type in ("user.created", "user.updated"):
        clerk_user_id = data.get("id", "")
        primary_email_id = data.get("primary_email_address_id")
        email = ""
        for addr in data.get("email_addresses", []):
            if addr.get("id") == primary_email_id:
                email = addr.get("email_address", "")
                break

        first = data.get("first_name") or ""
        last = data.get("last_name") or ""
        display_name = f"{first} {last}".strip() or clerk_user_id
        avatar_url = data.get("image_url") or data.get("profile_image_url")
        username = data.get("username")

        await users_svc.upsert(
            db,
            clerk_user_id=clerk_user_id,
            display_name=display_name,
            email=email,
            avatar_url=avatar_url,
            username=username,
        )
        logger.info("Upserted user %s via %s", clerk_user_id, event_type)

    return {"status": "ok"}
```

- [ ] **Step 3: Register router in `api/main.py`**

Change line 11:
```python
from routers import notebook, problems, submissions, users
```
to:
```python
from routers import notebook, problems, submissions, users, webhooks
```

Add after `app.include_router(users.router)`:
```python
app.include_router(webhooks.router)
```

- [ ] **Step 4: Commit**

```bash
git add api/routers/webhooks.py api/main.py .env.example
git commit -m "feat: add POST /webhooks/clerk with Svix signature verification"
```

---

### Task A3: PATCH /users/me/nickname

**Files:**
- Modify: `api/models.py`
- Modify: `api/routers/users.py`

- [ ] **Step 1: Add `NicknameRequest` to `api/models.py`**

After the `SubmitRequest` class, add:
```python

class NicknameRequest(BaseModel):
    nickname: str

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nickname cannot be empty")
        if len(v) > 30:
            raise ValueError("Nickname must be 30 characters or fewer")
        return v
```

- [ ] **Step 2: Replace `api/routers/users.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import NicknameRequest
from services.auth import verify_clerk_token
import services.users as users_svc

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    user = await users_svc.get_by_clerk_id(db, user_id)
    if not user:
        await users_svc.upsert(db, clerk_user_id=user_id, display_name="", email="")
        user = {"clerk_user_id": user_id, "display_name": "", "email": "", "nickname": None}
    return user


@router.patch("/me/nickname")
async def set_nickname(
    body: NicknameRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    await users_svc.set_nickname(db, user_id, body.nickname)
    user = await users_svc.get_by_clerk_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

- [ ] **Step 3: Commit**

```bash
git add api/models.py api/routers/users.py
git commit -m "feat: add PATCH /users/me/nickname endpoint"
```

---

### Task A4: GET /submissions/me + fix handle resolution in POST /submissions

**Files:**
- Modify: `api/models.py`
- Modify: `api/routers/submissions.py`

- [ ] **Step 1: Update `api/models.py`**

In `SubmitRequest`, remove the line:
```python
    handle: str = "anonymous"
```

At the end of the file, add:
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
```

- [ ] **Step 2: Replace `api/routers/submissions.py`**

```python
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import MySubmissionEntry, SubmitRequest, SubmissionResponse, SubmissionStatus
from services.judge import run_judge
from services.auth import verify_clerk_token
import services.problems as problems_svc
import services.submissions as submissions_svc
import services.users as users_svc

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse)
async def submit(
    req: SubmitRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]

    # Resolve handle from stored user profile
    user = await users_svc.get_by_clerk_id(db, user_id)
    handle = (user.get("nickname") or user.get("display_name") or user_id) if user else user_id

    doc = await problems_svc.get_by_id(db, req.problem_id)

    result = await run_judge(
        user_code=req.code,
        problem_id=doc["slug"],
        seed=doc.get("judge_seed", 42),
    )

    try:
        await submissions_svc.insert(
            db=db,
            problem_id=req.problem_id,
            user_id=user_id,
            handle=handle,
            language=req.language.value,
            code=req.code,
            char_count=result.char_count,
            status=result.status.value,
            timing_ms=result.timing_ms,
            error_msg=result.error or "",
        )
        if result.status == SubmissionStatus.correct:
            await problems_svc.increment_solve_count(db, req.problem_id)
    except Exception as e:
        print(f"[warn] db write failed: {e}")

    rank = None
    if result.status == SubmissionStatus.correct and result.timing_ms is not None:
        try:
            lb = await submissions_svc.get_leaderboard(db, req.problem_id, limit=1000)
            rank = sum(
                1 for e in lb
                if e["timing_ms"] < result.timing_ms
                or (e["timing_ms"] == result.timing_ms and e["char_count"] < result.char_count)
            ) + 1
        except Exception as e:
            print(f"[warn] leaderboard rank failed: {e}")

    return SubmissionResponse(
        problem_id=req.problem_id,
        status=result.status,
        timing_ms=result.timing_ms,
        char_count=result.char_count,
        leaderboard_rank=rank,
        error=result.error,
        failing_input=result.failing_input,
        expected_output=result.expected_output,
        actual_output=result.actual_output,
    )


@router.get("/me", response_model=list[MySubmissionEntry])
async def get_my_submissions(
    problem_id: int = Query(...),
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    return await submissions_svc.get_for_user(db, user_id, problem_id)
```

- [ ] **Step 3: Commit**

```bash
git add api/models.py api/routers/submissions.py
git commit -m "feat: resolve submission handle from DB profile, add GET /submissions/me"
```

---

## TRACK B — Web

### Task B1: Env var + middleware

**Files:**
- Modify: `web/.env.local`
- Modify: `web/middleware.ts`

- [ ] **Step 1: Add `NEXT_PUBLIC_API_URL` to `web/.env.local`**

Append:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 2: Replace `web/middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/auth(.*)'])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/aiyer/qlab
git add web/.env.local web/middleware.ts
git commit -m "feat(web): add NEXT_PUBLIC_API_URL, keep /auth routes public in middleware"
```

---

### Task B2: /profile/setup page

**Files:**
- Create: `web/app/profile/setup/page.tsx`

- [ ] **Step 1: Create `web/app/profile/setup/page.tsx`**

```tsx
'use client'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ProfileSetup() {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromVscode = searchParams.get('from') === 'vscode'

  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Nickname cannot be empty'); return }
    if (trimmed.length > 30) { setError('Nickname must be 30 characters or fewer'); return }
    setError('')
    setSaving(true)

    try {
      const token = await getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.detail
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to save nickname')
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
        setSaving(false)
        return
      }

      if (fromVscode) {
        const freshToken = await getToken()
        window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(freshToken ?? '')}`
      } else {
        router.push('/profile')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 600 }}>Choose your qLab nickname</h1>
      <p style={{ color: '#666', fontSize: '14px', marginTop: '-8px' }}>This is how you'll appear on the leaderboard.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="e.g. qwizard"
          maxLength={30}
          style={{ padding: '8px 12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
          autoFocus
        />
        {error && <p style={{ color: '#c00', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '9px 0', fontSize: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/profile/setup/page.tsx
git commit -m "feat(web): add /profile/setup nickname registration page"
```

---

### Task B3: Update /auth/callback to check nickname

**Files:**
- Modify: `web/app/auth/callback/page.tsx`

- [ ] **Step 1: Replace `web/app/auth/callback/page.tsx`**

```tsx
'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth()
  const [message, setMessage] = useState('Signing you in to qLab…')

  useEffect(() => {
    if (!isLoaded) return

    async function handleCallback() {
      const token = await getToken()
      if (!token) {
        setMessage('Could not get token. Please try signing in again.')
        return
      }

      // Check if user has a nickname; redirect to setup if not
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      try {
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const user = await res.json()
          if (!user.nickname) {
            window.location.href = '/profile/setup?from=vscode'
            return
          }
        }
      } catch {
        // API unreachable — proceed to VS Code anyway
      }

      setMessage('Returning to VS Code…')
      window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
    }

    handleCallback()
  }, [isLoaded, getToken])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '18px' }}>{message}</p>
      <p style={{ color: '#888', fontSize: '14px' }}>You can close this tab once VS Code opens.</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/auth/callback/page.tsx
git commit -m "feat(web): redirect to /profile/setup if nickname not set after sign-in"
```

---

### Task B4: /profile page

**Files:**
- Create: `web/app/profile/page.tsx`

- [ ] **Step 1: Create `web/app/profile/page.tsx`**

```tsx
'use client'
import { useUser } from '@clerk/nextjs'

export default function ProfilePage() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading…</p>
      </div>
    )
  }

  const displayName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || 'qLab User'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      {user?.imageUrl && (
        <img src={user.imageUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
      )}
      <h1 style={{ fontSize: '20px', fontWeight: 600 }}>{displayName}</h1>
      {user?.primaryEmailAddress && (
        <p style={{ color: '#888', fontSize: '14px' }}>{user.primaryEmailAddress.emailAddress}</p>
      )}
      <p style={{ color: '#aaa', fontSize: '13px', marginTop: '8px' }}>Signed in to qLab</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/profile/page.tsx
git commit -m "feat(web): add /profile page showing user avatar and display name"
```

---

## TRACK C — Extension

### Task C1: api.ts — add UserSubmission type, getMySubmissions, remove handle from submitSolution

**Files:**
- Modify: `vscode-extension/src/api.ts`

- [ ] **Step 1: Add `UserSubmission` interface after `ExecuteResult`**

After the `ExecuteResult` interface (line 58), insert:
```typescript
export interface UserSubmission {
  problem_id: number
  handle: string
  status: string
  timing_ms?: number
  char_count?: number
  language: string
  submitted_at: string
  is_best: boolean
}
```

- [ ] **Step 2: Add `authGet` helper method to `QLabApi` class**

After the closing brace of `private async post<T>`, add:
```typescript
  private async authGet<T>(path: string): Promise<T | null> {
    const headers: Record<string, string> = {}
    if (this.getToken) {
      const token = await this.getToken()
      if (!token) return null
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${this.baseUrl}${path}`, { headers })
    if (res.status === 401 || res.status === 403) return null
    if (!res.ok) throw new Error(`API ${path} returned ${res.status}`)
    return res.json() as Promise<T>
  }
```

- [ ] **Step 3: Add `getMySubmissions` method after `getLeaderboard`**

```typescript
  async getMySubmissions(problemId: number): Promise<UserSubmission[] | null> {
    return this.authGet<UserSubmission[]>(`/submissions/me?problem_id=${problemId}`)
  }
```

- [ ] **Step 4: Update `submitSolution` — remove handle parameter**

Replace the `submitSolution` signature and body:

Old:
```typescript
  async submitSolution(
    problemId: number,
    code: string,
    handle: string,
    language = 'q'
  ): Promise<SubmitResult> {
    const { status, data } = await this.post<SubmitResult & { detail?: unknown[] }>(
      '/submissions',
      { problem_id: problemId, code, language, handle }
    )
```

New:
```typescript
  async submitSolution(
    problemId: number,
    code: string,
    language = 'q'
  ): Promise<SubmitResult> {
    const { status, data } = await this.post<SubmitResult & { detail?: unknown[] }>(
      '/submissions',
      { problem_id: problemId, code, language }
    )
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd /home/aiyer/qlab/vscode-extension && npm run compile 2>&1 | head -30
```
Expected: exits 0, no error lines.

- [ ] **Step 6: Commit**

```bash
git add vscode-extension/src/api.ts
git commit -m "feat(ext): add getMySubmissions, remove handle from submitSolution"
```

---

### Task C2: ProblemPanel — fuse Examples into Description, add My Submissions tab, remove handle input

**Files:**
- Modify: `vscode-extension/src/ProblemPanel.ts`

This task touches one large file. Work top-to-bottom through each change.

- [ ] **Step 1: Update the import line (line 5)**

Old:
```typescript
import type { QLabApi, ProblemDetail, LeaderboardEntry, SubmitResult, ExecuteResult } from './api'
```
New:
```typescript
import type { QLabApi, ProblemDetail, LeaderboardEntry, SubmitResult, ExecuteResult, UserSubmission } from './api'
```

- [ ] **Step 2: Update `WebviewMessage` interface**

Find the `WebviewMessage` interface (around line 233). Replace it:
```typescript
interface WebviewMessage {
  type: 'getEditorCode' | 'submit' | 'runTest' | 'refreshLeaderboard' | 'openInEditor' | 'getMySubmissions'
  target?: string
  code?: string
}
```
(Removes `handle?: string`, adds `'getMySubmissions'` to the union.)

- [ ] **Step 3: Add `_sendMySubmissions` method to the class**

After the `_sendLeaderboard` method, add:
```typescript
  private async _sendMySubmissions(): Promise<void> {
    const rows = await this.api.getMySubmissions(this.problem.id).catch(() => null)
    this._post({ type: 'mySubmissions', data: rows })
  }
```

- [ ] **Step 4: Update `_handleMessage` switch**

In `_handleMessage`, update the `submit` case:

Old:
```typescript
      case 'submit':
        await this._handleSubmit(msg.code, msg.handle)
        break
```
New:
```typescript
      case 'submit':
        await this._handleSubmit(msg.code)
        break
```

Add the new `getMySubmissions` case before the closing brace of the switch:
```typescript
      case 'getMySubmissions':
        await this._sendMySubmissions()
        break
```

- [ ] **Step 5: Update `_handleSubmit` — remove handle parameter**

Change the method signature from:
```typescript
  private async _handleSubmit(code: string | undefined, handle: string | undefined): Promise<void> {
```
to:
```typescript
  private async _handleSubmit(code: string | undefined): Promise<void> {
```

Inside the method, replace the `submitSolution` call:

Old:
```typescript
      const result: SubmitResult = await this.api.submitSolution(
        this.problem.id,
        code ?? '',
        handle || 'anonymous'
      )
```
New:
```typescript
      const result: SubmitResult = await this.api.submitSolution(
        this.problem.id,
        code ?? '',
      )
```

- [ ] **Step 6: Update the tab bar in `buildHtml`**

Find:
```html
  <div class="tab-bar">
    <button class="tab active" data-tab="description">Description</button>
    <button class="tab" data-tab="examples">Examples</button>
    <button class="tab" data-tab="test">Test</button>
    <button class="tab" data-tab="submit">Submit</button>
    <button class="tab" data-tab="community">Community</button>
  </div>
```
Replace with:
```html
  <div class="tab-bar">
    <button class="tab active" data-tab="description">Description</button>
    <button class="tab" data-tab="test">Test</button>
    <button class="tab" data-tab="submit">Submit</button>
    <button class="tab" data-tab="mysubmissions">My Submissions</button>
    <button class="tab" data-tab="community">Community</button>
  </div>
```

- [ ] **Step 7: Update the Description tab pane — add examples inline**

Find the description tab pane. Replace the closing section (after `${hints}`) so the pane ends with examples above the button:

Old description pane (full):
```html
    <!-- ── DESCRIPTION ─────────────────────────────────────────── -->
    <div class="tab-pane active" id="description">
      <h3>Problem</h3>
      <p>${esc(p.narrative).replace(/\n/g, '<br>')}</p>

      <h3>Input</h3>
      <p>${esc(p.input_spec).replace(/\n/g, '<br>')}</p>

      <h3>Output</h3>
      <p>${esc(p.output_spec)}</p>

      <h3>Winning Criteria</h3>
      <p>${esc(p.winning_criteria)}</p>

      ${hints}

      <div class="btn-row" style="margin-top:16px">
        <button class="btn-secondary" id="openInEditorBtn">📝 Open Solution File</button>
      </div>
    </div>
```
New:
```html
    <!-- ── DESCRIPTION ─────────────────────────────────────────── -->
    <div class="tab-pane active" id="description">
      <h3>Problem</h3>
      <p>${esc(p.narrative).replace(/\n/g, '<br>')}</p>

      <h3>Input</h3>
      <p>${esc(p.input_spec).replace(/\n/g, '<br>')}</p>

      <h3>Output</h3>
      <p>${esc(p.output_spec)}</p>

      <h3>Winning Criteria</h3>
      <p>${esc(p.winning_criteria)}</p>

      <h3>Examples</h3>
      ${examples}
      <pre style="margin-top:8px">${esc(p.test_call)}</pre>

      ${hints}

      <div class="btn-row" style="margin-top:16px">
        <button class="btn-secondary" id="openInEditorBtn">📝 Open Solution File</button>
      </div>
    </div>
```

- [ ] **Step 8: Remove the Examples tab pane**

Delete the entire block:
```html
    <!-- ── EXAMPLES ────────────────────────────────────────────── -->
    <div class="tab-pane" id="examples">
      ${examples}
      <h3 style="margin-top:18px">Test call</h3>
      <pre>${esc(p.test_call)}</pre>
    </div>
```

- [ ] **Step 9: Remove the handle field from the Submit tab pane**

Find and delete this block in the submit tab pane:
```html
      <div class="field">
        <label for="handle">Handle (optional)</label>
        <input type="text" id="handle" placeholder="your name / alias" maxlength="32">
      </div>
```

- [ ] **Step 10: Add My Submissions tab pane CSS**

In the `<style>` block, after the `.lb-handle` rule, add:
```css
    /* ── My Submissions ── */
    .best-row td { font-weight: 600; }
    .best-star { color: #f5a623; margin-right: 3px; }
    .sub-correct { color: var(--vscode-testing-iconPassed); }
    .sub-wrong, .sub-error, .sub-timeout { color: var(--vscode-testing-iconFailed); }
```

- [ ] **Step 11: Add My Submissions tab pane HTML**

After the submit tab pane and before the community tab pane, insert:
```html
    <!-- ── MY SUBMISSIONS ─────────────────────────────────────── -->
    <div class="tab-pane" id="mysubmissions">
      <div id="mySubContent"><span class="spinner">⟳</span> Loading…</div>
    </div>
```

- [ ] **Step 12: Update the JS in the `<script>` block**

**12a.** Remove the state restore and handle input listener. Find and delete:
```javascript
    if (state.handle) document.getElementById('handle').value = state.handle;
```
and:
```javascript
    document.getElementById('handle').addEventListener('input', function() {
      state.handle = this.value;
      vscode.setState(state);
    });
```

**12b.** Update the submit button click handler — remove the handle read:

Old:
```javascript
    document.getElementById('submitBtn').addEventListener('click', () => {
      if (!submitCode) return;
      const handle = document.getElementById('handle').value.trim();
      const resultWrap = document.getElementById('submitResultWrap');
      resultWrap.style.display = 'block';
      resultWrap.innerHTML = '<div class="result"><span class="spinner">⟳</span> Judging your solution…</div>';
      document.getElementById('submitBtn').disabled = true;
      vscode.postMessage({ type: 'submit', code: submitCode, handle });
    });
```
New:
```javascript
    document.getElementById('submitBtn').addEventListener('click', () => {
      if (!submitCode) return;
      const resultWrap = document.getElementById('submitResultWrap');
      resultWrap.style.display = 'block';
      resultWrap.innerHTML = '<div class="result"><span class="spinner">⟳</span> Judging your solution…</div>';
      document.getElementById('submitBtn').disabled = true;
      vscode.postMessage({ type: 'submit', code: submitCode });
    });
```

**12c.** After the existing `querySelectorAll('.tab').forEach` tab-switching block, add a My Submissions load trigger:
```javascript
    // Load My Submissions when that tab is selected
    document.querySelector('.tab[data-tab="mysubmissions"]').addEventListener('click', () => {
      vscode.postMessage({ type: 'getMySubmissions' });
    });
```

**12d.** In the `window.addEventListener('message', ...)` switch, add after the `leaderboard` case:
```javascript
        case 'mySubmissions': {
          renderMySubmissions(msg.data);
          break;
        }
```

**12e.** Add `renderMySubmissions` function alongside `renderLeaderboard`:
```javascript
    function renderMySubmissions(rows) {
      const el = document.getElementById('mySubContent');
      if (rows === null) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">Sign in to qLab to see your submissions.</p>';
        return;
      }
      if (!rows.length) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">No submissions yet for this problem.</p>';
        return;
      }
      let html = '<table><thead><tr><th>Date</th><th>Status</th><th>ms</th><th>chars</th><th>lang</th></tr></thead><tbody>';
      for (const r of rows) {
        const date = new Date(r.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const statusClass = 'sub-' + r.status;
        const star = r.is_best ? '<span class="best-star">★</span>' : '';
        const ms = r.timing_ms != null ? r.timing_ms : '—';
        const chars = r.char_count != null ? r.char_count : '—';
        html += '<tr class="' + (r.is_best ? 'best-row' : '') + '">' +
                '<td>' + e(date) + '</td>' +
                '<td class="' + statusClass + '">' + star + e(r.status) + '</td>' +
                '<td>' + ms + '</td>' +
                '<td>' + chars + '</td>' +
                '<td>' + e(r.language) + '</td></tr>';
      }
      html += '</tbody></table>';
      el.innerHTML = html;
    }
```

- [ ] **Step 13: Verify no TypeScript errors**

```bash
cd /home/aiyer/qlab/vscode-extension && npm run compile 2>&1 | head -30
```
Expected: exits 0, no error lines.

- [ ] **Step 14: Commit**

```bash
git add vscode-extension/src/ProblemPanel.ts
git commit -m "feat(ext): fuse examples into description, add My Submissions tab, remove handle input"
```

---

### Task C3: extension.ts — welcome prompt + openProfile command

**Files:**
- Modify: `vscode-extension/src/extension.ts`

- [ ] **Step 1: Add welcome prompt at the top of `activate`**

After the `getToken` declaration (line 12), insert:
```typescript
  // Show welcome prompt once if not signed in
  getToken().then(token => {
    if (!token) {
      vscode.window.showInformationMessage(
        'Welcome to qLab! Sign in to submit solutions.',
        'Sign In'
      ).then(action => {
        if (action === 'Sign In') vscode.commands.executeCommand('qlab.signIn')
      })
    }
  })
```

- [ ] **Step 2: Add `openProfile` command after `signIn`**

After the `signIn` command registration, add:
```typescript
  const openProfile = vscode.commands.registerCommand('qlab.openProfile', async () => {
    const webUrl = cfg().get<string>('webUrl') ?? 'http://localhost:9091'
    await vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/profile`))
  })
```

- [ ] **Step 3: Add `openProfile` to subscriptions**

Update the final `context.subscriptions.push(...)`:

Old:
```typescript
  context.subscriptions.push(
    tree, refresh, openProblem, submitActive, setApiUrl, signIn, uriHandler, configWatcher
  )
```
New:
```typescript
  context.subscriptions.push(
    tree, refresh, openProblem, submitActive, setApiUrl, signIn, openProfile, uriHandler, configWatcher
  )
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd /home/aiyer/qlab/vscode-extension && npm run compile 2>&1 | head -30
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add vscode-extension/src/extension.ts
git commit -m "feat(ext): add welcome sign-in prompt on activation, add qlab.openProfile command"
```

---

### Task C4: package.json — register openProfile + add to sidebar menu

**Files:**
- Modify: `vscode-extension/package.json`

- [ ] **Step 1: Add `openProfile` to the commands array**

After the `qlab.signIn` command object, insert:
```json
      {
        "command": "qlab.openProfile",
        "title": "Open Profile",
        "icon": "$(account)",
        "category": "qLab"
      }
```

- [ ] **Step 2: Add `openProfile` to `view/title` menu**

In `"menus"` → `"view/title"`, after the refresh entry, add:
```json
        {
          "command": "qlab.openProfile",
          "when": "view == qlab.problems",
          "group": "navigation"
        }
```

- [ ] **Step 3: Build and install the extension**

```bash
cd /home/aiyer/qlab/vscode-extension && npm run install-ext 2>&1 | tail -15
```
Expected: `Extension 'qlab.qlab' v0.1.0 was successfully installed.`

- [ ] **Step 4: Commit**

```bash
git add vscode-extension/package.json vscode-extension/qlab-0.1.0.vsix vscode-extension/out/
git commit -m "feat(ext): register qlab.openProfile command and add to sidebar menu"
```
