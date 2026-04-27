# Authentication Design

**Date:** 2026-04-27  
**Status:** Approved

---

## Overview

Add Clerk-based authentication to qLab across three components:

1. **Next.js web app** (`web/`) — sign-in/sign-up pages that redirect back to VS Code with a JWT
2. **FastAPI backend** (`api/`) — JWT verification dependency protecting `POST /submissions` and `GET /me`
3. **VS Code extension** (`vscode-extension/`) — sign-in command, URI handler, SecretStorage, auth header on submissions

---

## Architecture

```
Next.js (web/)              FastAPI (api/)           VS Code extension
──────────────────          ──────────────────       ─────────────────
/sign-in  → Clerk UI        GET /me (protected)      qlab.signIn command
/sign-up  → Clerk UI        POST /submissions         URI handler /auth
/auth/callback                (protected)             SecretStorage
  → useAuth().getToken()        verify_clerk_token        Authorization header
  → redirect to               dependency              401 re-sign-in prompt
    vscode://qlab.qlab
    /auth?token=<jwt>
```

---

## Component 1 — Next.js app (`web/`)

**Stack:** Next.js 14 (App Router), `@clerk/nextjs`

**Pages:**
- `/sign-in` — Clerk `<SignIn>` component, redirects to `/auth/callback` on success
- `/sign-up` — Clerk `<SignUp>` component, redirects to `/auth/callback` on success
- `/auth/callback` — client component; calls `useAuth().getToken()`, then sets `window.location.href = vscode://qlab.qlab/auth?token=<jwt>`. Displays "Returning to VS Code..." while redirecting.

**Scope:** auth plumbing only — no nav, no layout, no styling beyond minimal centering. Designed to be extended into a full web presence later.

**Env vars (`web/.env.local`):**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/callback
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/callback
```

---

## Component 2 — FastAPI JWT verification (`api/`)

**New file:** `api/services/auth.py`

Implements `verify_clerk_token` as a FastAPI dependency:
1. Fetches Clerk JWKS from `CLERK_JWKS_URL` on first use
2. Caches JWKS in memory with a 5-minute TTL
3. Verifies JWT signature, expiry, and issuer using `PyJWT` + `cryptography`
4. Returns decoded claims (`sub` = Clerk user ID)
5. Raises `HTTP 401` with `{"detail": "Invalid or expired token"}` on failure

**Protected endpoints:**
- `POST /submissions` — `user_id` populated from `claims["sub"]`, never from request body
- `GET /me` — returns the authenticated user's profile from the `users` collection

**Public endpoints (unchanged):**
- `GET /problems`
- `GET /problems/:slug`
- `GET /problems/:slug/leaderboard`
- `POST /notebook/execute`
- `POST /notebook/reset`

**New env vars (added to `.env`):**
```
CLERK_SECRET_KEY=sk_...
CLERK_JWKS_URL=https://<clerk-domain>/.well-known/jwks.json
```

**New dependencies (`requirements.txt`):** `PyJWT`, `cryptography`

---

## Component 3 — VS Code extension

**Files changed:** `extension.ts`, `api.ts` only.

### `api.ts`
- `QLabApi` constructor gains `getToken?: () => Promise<string | undefined>`
- `post()` calls `getToken()` and attaches `Authorization: Bearer <token>` when present
- On 401 response, returns `{ status: 'unauthorized' }` for the caller to handle

### `extension.ts`
- **`qlab.signIn` command** — calls `vscode.env.openExternal` with the Next.js sign-in URL (configurable via `qlab.webUrl` setting, defaults to the deployed web app URL)
- **URI handler extended** — handles `/auth` path: extracts `token` query param, stores via `context.secrets.set('qlab.token', token)`, shows "Signed in to qLab" notification
- **`api()` factory** — reads token from `context.secrets.get('qlab.token')` and passes as `getToken` to `QLabApi`
- **401 handling** — submit flow shows "Please sign in to submit" with a "Sign In" action button that triggers `qlab.signIn`

---

## Data flow — sign-in

1. User runs `qlab.signIn` in VS Code
2. Browser opens to Next.js `/sign-in`
3. User authenticates via Clerk
4. Clerk redirects to `/auth/callback`
5. Callback page calls `getToken()`, redirects to `vscode://qlab.qlab/auth?token=<jwt>`
6. VS Code URI handler fires, stores token in SecretStorage
7. Notification: "Signed in to qLab"

## Data flow — submission

1. Extension reads token from SecretStorage via `getToken()`
2. `POST /submissions` with `Authorization: Bearer <jwt>`
3. FastAPI `verify_clerk_token` verifies JWT, extracts `sub`
4. `user_id` set to `sub` before inserting into MongoDB
5. On 401: extension prompts "Sign In" — restarts sign-in flow

---

## What is not built

- User profile page, submission history, leaderboard — deferred to later web phases
- Token refresh — Clerk JWTs last ~60s; user re-signs-in on 401 (acceptable for now)
- Sign-out command — deferred; users can clear SecretStorage manually if needed
