# Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk-based sign-in to qLab — a Next.js app handles the browser auth flow, FastAPI verifies JWTs on protected endpoints, and the VS Code extension stores and sends the token.

**Architecture:** Browser opens Next.js `/sign-in` → Clerk authenticates → `/auth/callback` redirects to `vscode://qlab.qlab/auth?token=<jwt>` → VS Code URI handler stores token in SecretStorage → all `POST /submissions` calls send `Authorization: Bearer <token>` → FastAPI verifies via Clerk JWKS.

**Tech Stack:** Next.js 14 (App Router), `@clerk/nextjs`, FastAPI, `PyJWT` 2.x with `PyJWKClient`, TypeScript, `vscode.SecretStorage`

---

## File Map

**Create:**
- `web/package.json` — Next.js + Clerk deps
- `web/next.config.ts` — minimal Next.js config
- `web/tsconfig.json` — TypeScript config
- `web/middleware.ts` — Clerk middleware (public routes)
- `web/.env.local` — Clerk keys (not committed)
- `web/app/layout.tsx` — root layout with `ClerkProvider`
- `web/app/sign-in/[[...sign-in]]/page.tsx` — Clerk `<SignIn />` component
- `web/app/sign-up/[[...sign-up]]/page.tsx` — Clerk `<SignUp />` component
- `web/app/auth/callback/page.tsx` — extracts JWT, redirects to `vscode://`
- `api/services/auth.py` — `verify_clerk_token` FastAPI dependency
- `api/routers/users.py` — `GET /me` endpoint
- `tests/test_auth.py` — FastAPI auth tests

**Modify:**
- `api/requirements.txt` — add `PyJWT==2.9.0`, `cryptography==43.0.3`
- `api/main.py` — include users router
- `api/routers/submissions.py` — add `verify_clerk_token` dependency
- `.env` — add `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`
- `vscode-extension/package.json` — add `qlab.signIn` command, `qlab.webUrl` setting
- `vscode-extension/src/api.ts` — `getToken`, auth header, 401 handling
- `vscode-extension/src/extension.ts` — `qlab.signIn`, URI `/auth` handler, 401 prompt

---

## Task 1: FastAPI auth service

**Files:**
- Create: `api/services/auth.py`
- Create: `tests/test_auth.py`
- Modify: `api/requirements.txt`

- [ ] **Step 1: Add PyJWT and cryptography to requirements**

Edit `api/requirements.txt` — add after `motor==3.6.0`:
```
PyJWT==2.9.0
cryptography==43.0.3
```

Install:
```bash
pip install PyJWT==2.9.0 cryptography==43.0.3
```

- [ ] **Step 2: Write the failing tests**

Create `tests/test_auth.py`:
```python
import time
import pytest
from unittest.mock import MagicMock, patch
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


def make_rsa_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )
    return private_key, private_key.public_key()


def make_token(private_key, payload: dict) -> str:
    return jwt.encode(payload, private_key, algorithm="RS256")


def make_signing_key_mock(public_key):
    mock = MagicMock()
    mock.key = public_key
    return mock


@pytest.mark.asyncio
async def test_valid_token_returns_claims():
    from api.services.auth import verify_clerk_token

    private_key, public_key = make_rsa_key_pair()
    token = make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) + 3600})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        claims = await verify_clerk_token(credentials)

    assert claims["sub"] == "user_abc"


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    from api.services.auth import verify_clerk_token

    private_key, public_key = make_rsa_key_pair()
    token = make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) - 10})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc:
            await verify_clerk_token(credentials)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_invalid_token_raises_401():
    from api.services.auth import verify_clerk_token

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not.a.token")

    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.side_effect = Exception("bad token")

    with patch("api.services.auth._get_jwks_client", return_value=mock_client):
        with pytest.raises(HTTPException) as exc:
            await verify_clerk_token(credentials)

    assert exc.value.status_code == 401
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /home/aiyer/qlab
PYTHONPATH=api pytest tests/test_auth.py -v
```

Expected: `ModuleNotFoundError: No module named 'api.services.auth'`

- [ ] **Step 4: Create `api/services/auth.py`**

```python
import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")

_jwks_client: PyJWKClient | None = None

bearer = HTTPBearer()


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(CLERK_JWKS_URL, cache_keys=True)
    return _jwks_client


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
PYTHONPATH=api pytest tests/test_auth.py -v
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/requirements.txt api/services/auth.py tests/test_auth.py
git commit -m "Add Clerk JWT verification service with JWKS caching"
```

---

## Task 2: Protect POST /submissions and add GET /me

**Files:**
- Create: `api/routers/users.py`
- Modify: `api/routers/submissions.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write failing test for protected submission endpoint**

Add to `tests/test_auth.py`:
```python
from fastapi.testclient import TestClient

def test_submit_without_token_returns_401():
    import importlib, sys
    # Ensure fresh import
    for key in list(sys.modules.keys()):
        if "api." in key:
            del sys.modules[key]

    from api.main import app
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post("/submissions", json={
        "problem_id": 1,
        "code": "func:{[x] \"YES\"}",
        "handle": "test"
    })
    assert resp.status_code == 403  # No bearer header → 403 from HTTPBearer
```

Run: `PYTHONPATH=api pytest tests/test_auth.py::test_submit_without_token_returns_401 -v`
Expected: FAIL (currently 422 or 200, not 403)

- [ ] **Step 2: Update `api/routers/submissions.py` to require auth**

Replace the import block and `submit` signature:
```python
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import SubmitRequest, SubmissionResponse, SubmissionStatus
from services.judge import run_judge
from services.auth import verify_clerk_token
import services.problems as problems_svc
import services.submissions as submissions_svc

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse)
async def submit(
    req: SubmitRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
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
            handle=req.handle,
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
```

- [ ] **Step 3: Create `api/routers/users.py`**

```python
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
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
        user = {"clerk_user_id": user_id, "display_name": "", "email": ""}
    return user
```

- [ ] **Step 4: Register users router in `api/main.py`**

Add import and `include_router` call:
```python
from routers import notebook, problems, submissions, users  # add users

# after app.include_router(notebook.router):
app.include_router(users.router)
```

- [ ] **Step 5: Run the test**

```bash
PYTHONPATH=api pytest tests/test_auth.py::test_submit_without_token_returns_401 -v
```

Expected: PASS (403 from HTTPBearer when no Authorization header)

- [ ] **Step 6: Commit**

```bash
git add api/routers/submissions.py api/routers/users.py api/main.py tests/test_auth.py
git commit -m "Protect POST /submissions with Clerk JWT, add GET /users/me"
```

---

## Task 3: Add Clerk env vars

**Files:**
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Add Clerk vars to `.env`**

Open `.env` and add:
```
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://<your-clerk-domain>.clerk.accounts.dev/.well-known/jwks.json
```

The JWKS URL is found in the Clerk dashboard under **API Keys → Advanced → JWKS URL**.

- [ ] **Step 2: Add placeholder vars to `.env.example`**

Open `.env.example` and add:
```
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
```

- [ ] **Step 3: Commit `.env.example` only (never commit `.env`)**

```bash
git add .env.example
git commit -m "Add Clerk env var placeholders to .env.example"
```

---

## Task 4: Scaffold Next.js app

**Files:**
- Create: `web/package.json`
- Create: `web/next.config.ts`
- Create: `web/tsconfig.json`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "qlab-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "@clerk/nextjs": "^5.0.0",
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `web/next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 3: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd /home/aiyer/qlab/web && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/aiyer/qlab
git add web/package.json web/next.config.ts web/tsconfig.json web/package-lock.json
git commit -m "Scaffold Next.js web app for auth"
```

---

## Task 5: Clerk middleware and root layout

**Files:**
- Create: `web/middleware.ts`
- Create: `web/app/layout.tsx`
- Create: `web/.env.local`

- [ ] **Step 1: Create `web/middleware.ts`**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 2: Create `web/app/layout.tsx`**

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'qLab',
  description: 'Competitive coding for kdb+/q developers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: Create `web/.env.local`**

Fill in your actual Clerk keys from the Clerk dashboard:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/callback
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/callback
```

- [ ] **Step 4: Commit (not `.env.local`)**

```bash
cd /home/aiyer/qlab
git add web/middleware.ts web/app/layout.tsx
git commit -m "Add Clerk middleware and root layout to web app"
```

---

## Task 6: Sign-in, sign-up, and callback pages

**Files:**
- Create: `web/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `web/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `web/app/auth/callback/page.tsx`

- [ ] **Step 1: Create `web/app/sign-in/[[...sign-in]]/page.tsx`**

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 2: Create `web/app/sign-up/[[...sign-up]]/page.tsx`**

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 3: Create `web/app/auth/callback/page.tsx`**

This is a client component — it needs `useAuth()` to call `getToken()` after Clerk's session is established.

```typescript
'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth()
  const [message, setMessage] = useState('Signing you in to qLab...')

  useEffect(() => {
    if (!isLoaded) return

    getToken()
      .then(token => {
        if (!token) {
          setMessage('Could not get token. Please try signing in again.')
          return
        }
        setMessage('Returning to VS Code...')
        window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
      })
      .catch(() => {
        setMessage('Something went wrong. Please close this tab and try again.')
      })
  }, [isLoaded, getToken])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '18px' }}>{message}</p>
      <p style={{ color: '#888', fontSize: '14px' }}>You can close this tab once VS Code opens.</p>
    </div>
  )
}
```

- [ ] **Step 4: Start the dev server and test manually**

```bash
cd /home/aiyer/qlab/web && npm run dev
```

Open `http://localhost:3000/sign-in` — Clerk sign-in UI should render.  
Sign in with a test account.  
After sign-in, browser should show "Returning to VS Code..." and attempt `vscode://` redirect.

- [ ] **Step 5: Commit**

```bash
cd /home/aiyer/qlab
git add web/app/
git commit -m "Add sign-in, sign-up, and VS Code callback pages"
```

---

## Task 7: VS Code extension — api.ts auth header

**Files:**
- Modify: `vscode-extension/src/api.ts`

- [ ] **Step 1: Update `vscode-extension/src/api.ts`**

Replace the entire file:
```typescript
/**
 * Typed HTTP client for the qLab FastAPI backend.
 * Uses Node 18+ global fetch (available in VS Code 1.85+).
 */

export interface ProblemSummary {
  id: number
  slug: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  concepts: string[]
  posted_date: string
  solve_count: number
}

export interface Example {
  input: string
  output: string
  note?: string
}

export interface ProblemDetail extends ProblemSummary {
  narrative: string
  input_spec: string
  output_spec: string
  examples: Example[]
  hints: string[]
  winning_criteria: string
  test_call: string
}

export interface LeaderboardEntry {
  rank: number
  handle: string
  timing_ms: number
  char_count: number
  language: string
  submitted_at: string
}

export interface SubmitResult {
  submission_id?: number
  problem_id?: number
  status: string
  timing_ms?: number
  char_count?: number
  leaderboard_rank?: number
  error?: string
  failing_input?: string
  expected_output?: string
  actual_output?: string
}

export interface ExecuteResult {
  ok: boolean
  output?: string
  error?: string
}

export class QLabApi {
  constructor(
    private baseUrl: string,
    private getToken?: () => Promise<string | undefined>
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`)
    if (!res.ok) {
      throw new Error(`API ${path} returned ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  private async post<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (this.getToken) {
      const token = await this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as T
    return { status: res.status, data }
  }

  async getProblems(): Promise<ProblemSummary[]> {
    return this.get<ProblemSummary[]>('/problems')
  }

  async getProblem(slug: string): Promise<ProblemDetail> {
    return this.get<ProblemDetail>(`/problems/${slug}`)
  }

  async getLeaderboard(slug: string, limit = 10): Promise<LeaderboardEntry[]> {
    return this.get<LeaderboardEntry[]>(`/problems/${slug}/leaderboard?limit=${limit}`)
  }

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
    if (status === 401 || status === 403) {
      return { status: 'unauthorized', error: 'Please sign in to submit' }
    }
    if (status === 422) {
      const detail = (data as { detail?: Array<{ msg?: string }> }).detail
      const msg = detail?.[0]?.msg ?? JSON.stringify(detail)
      return { status: 'invalid', error: msg }
    }
    return data
  }

  async executeCode(code: string): Promise<ExecuteResult> {
    const { data } = await this.post<ExecuteResult>('/notebook/execute', { code })
    return data
  }

  async resetNotebook(): Promise<void> {
    await this.post('/notebook/reset', {})
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add vscode-extension/src/api.ts
git commit -m "Add auth token header and 401 handling to QLabApi"
```

---

## Task 8: VS Code extension — sign-in command and URI handler

**Files:**
- Modify: `vscode-extension/package.json`
- Modify: `vscode-extension/src/extension.ts`

- [ ] **Step 1: Add `qlab.signIn` command and `qlab.webUrl` setting to `vscode-extension/package.json`**

In the `"commands"` array, add:
```json
{
  "command": "qlab.signIn",
  "title": "Sign In",
  "category": "qLab"
}
```

In the `"configuration"` → `"properties"` object, add:
```json
"qlab.webUrl": {
  "type": "string",
  "default": "http://localhost:3000",
  "description": "qLab web app URL (used for sign-in)"
}
```

- [ ] **Step 2: Update `vscode-extension/src/extension.ts`**

Replace the entire file:
```typescript
import * as vscode from 'vscode'
import { QLabApi } from './api'
import { ProblemsProvider } from './ProblemsProvider'
import { ProblemPanel } from './ProblemPanel'
import type { ProblemSummary } from './api'

const TOKEN_KEY = 'qlab.token'

export function activate(context: vscode.ExtensionContext): void {
  const cfg = () => vscode.workspace.getConfiguration('qlab')

  const getToken = () => context.secrets.get(TOKEN_KEY)

  const api = () => new QLabApi(
    cfg().get<string>('apiUrl') ?? 'http://localhost:8000',
    getToken
  )

  // ── Sidebar tree ─────────────────────────────────────────────────────────
  const provider = new ProblemsProvider(api())
  const tree = vscode.window.createTreeView('qlab.problems', {
    treeDataProvider: provider,
    showCollapseAll: false,
  })

  // ── Commands ──────────────────────────────────────────────────────────────

  const refresh = vscode.commands.registerCommand('qlab.refresh', () => {
    provider['api'] = api()
    provider.refresh()
  })

  const openProblem = vscode.commands.registerCommand(
    'qlab.openProblem',
    async (problem?: ProblemSummary) => {
      if (!problem) {
        const problems = await api().getProblems().catch(() => null)
        if (!problems?.length) {
          vscode.window.showErrorMessage('Could not load problems. Is qLab running? (./start.sh)')
          return
        }

        type PickItem = vscode.QuickPickItem & { problem: ProblemSummary }
        const items: PickItem[] = problems.map(p => ({
          label: p.title,
          description: `[${p.difficulty}]  ${p.solve_count} solves`,
          detail: p.concepts.join(', '),
          problem: p,
        }))

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a problem',
          matchOnDescription: true,
          matchOnDetail: true,
        })

        if (!picked) return
        problem = picked.problem
      }

      await ProblemPanel.open(problem.slug, api(), context.extensionUri).catch(err => {
        vscode.window.showErrorMessage(`Failed to open problem: ${err}`)
      })
    }
  )

  const submitActive = vscode.commands.registerCommand('qlab.submitActive', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.q')) {
      vscode.window.showWarningMessage('Open a .q solution file first.')
      return
    }

    const fileName = editor.document.fileName
    const slugMatch = fileName.match(/([^/\\]+)\.q$/)
    if (!slugMatch) {
      vscode.window.showWarningMessage('Could not determine problem from filename.')
      return
    }
    const slug = slugMatch[1]

    await ProblemPanel.open(slug, api(), context.extensionUri).catch(err => {
      vscode.window.showErrorMessage(`Failed to open problem panel: ${err}`)
    })
  })

  const setApiUrl = vscode.commands.registerCommand('qlab.setApiUrl', async () => {
    const current = cfg().get<string>('apiUrl') ?? 'http://localhost:8000'
    const url = await vscode.window.showInputBox({
      prompt: 'qLab API URL',
      value: current,
      placeHolder: 'http://localhost:8000',
    })
    if (url !== undefined) {
      await cfg().update('apiUrl', url, vscode.ConfigurationTarget.Workspace)
      provider['api'] = api()
      provider.refresh()
      vscode.window.showInformationMessage(`qLab API URL set to ${url}`)
    }
  })

  const signIn = vscode.commands.registerCommand('qlab.signIn', async () => {
    const webUrl = cfg().get<string>('webUrl') ?? 'http://localhost:3000'
    await vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/sign-in`))
  })

  // ── URI handler — handles /open and /auth paths ───────────────────────────
  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/open') {
        const params = new URLSearchParams(uri.query)
        const slug = params.get('slug')
        if (!slug) {
          vscode.window.showErrorMessage('qLab URI missing ?slug= parameter.')
          return
        }
        await ProblemPanel.open(slug, api(), context.extensionUri).catch(err => {
          vscode.window.showErrorMessage(`Failed to open problem: ${err}`)
        })
        return
      }

      if (uri.path === '/auth') {
        const params = new URLSearchParams(uri.query)
        const token = params.get('token')
        if (!token) {
          vscode.window.showErrorMessage('qLab: sign-in failed — no token received.')
          return
        }
        await context.secrets.store(TOKEN_KEY, token)
        vscode.window.showInformationMessage('Signed in to qLab.')
        return
      }
    },
  })

  // ── Refresh on config change ──────────────────────────────────────────────
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('qlab.apiUrl')) {
      provider['api'] = api()
      provider.refresh()
    }
  })

  context.subscriptions.push(
    tree, refresh, openProblem, submitActive, setApiUrl, signIn, uriHandler, configWatcher
  )
}

export function deactivate(): void {}
```

- [ ] **Step 3: Add 401 handling to submit flow in `ProblemPanel.ts`**

Find the `submitSolution` call in `vscode-extension/src/ProblemPanel.ts`. Locate the section that handles the submit result and add an `unauthorized` case. Find:
```typescript
if (result.status === 'invalid') {
```
and add before it:
```typescript
if (result.status === 'unauthorized') {
  const action = await vscode.window.showErrorMessage(
    'Please sign in to submit solutions.',
    'Sign In'
  )
  if (action === 'Sign In') {
    vscode.commands.executeCommand('qlab.signIn')
  }
  return
}
```

- [ ] **Step 4: Build and reinstall extension**

```bash
cd /home/aiyer/qlab/vscode-extension && npm run install-ext
```

Expected: `Extension 'qlab-0.1.0.vsix' was successfully installed.`

Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"

- [ ] **Step 5: Commit**

```bash
cd /home/aiyer/qlab
git add vscode-extension/
git commit -m "Add qlab.signIn command, SecretStorage token, and 401 handling to extension"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Start the API**

```bash
cd /home/aiyer/qlab && ./start.sh
```

- [ ] **Step 2: Start the Next.js dev server**

```bash
cd /home/aiyer/qlab/web && npm run dev
```

- [ ] **Step 3: Verify unauthenticated submission is rejected**

```bash
curl -s -X POST http://localhost:8000/submissions \
  -H "Content-Type: application/json" \
  -d '{"problem_id": 1, "code": "func:{[x] \"YES\"}", "handle": "test"}' \
  | python3 -m json.tool
```

Expected: `{"detail": "Not authenticated"}` with status 403.

- [ ] **Step 4: Test sign-in flow in VS Code**

Run command palette → "qLab: Sign In". Browser opens to `http://localhost:3000/sign-in`. Sign in with your Clerk account. Page shows "Returning to VS Code..." and VS Code shows "Signed in to qLab."

- [ ] **Step 5: Verify authenticated submission succeeds**

In VS Code, open `qlab-solutions/p001_same_same.q` and submit with `Ctrl+Shift+S`. Should judge and return a result (not a sign-in prompt).

- [ ] **Step 6: Verify GET /me**

```bash
TOKEN=$(cat /tmp/qlab_test_token)  # or copy from VS Code SecretStorage via devtools
curl -s http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

Expected: `{"clerk_user_id": "user_...", "display_name": "", "email": ""}`.

- [ ] **Step 7: Verify public endpoints still work without auth**

```bash
curl -s http://localhost:8000/problems | python3 -m json.tool | grep '"title"'
```

Expected: problem titles returned with no auth required.
