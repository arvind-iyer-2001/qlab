# User Registration, Nickname, and My Submissions Design

**Date:** 2026-04-27
**Status:** Approved

---

## Overview

Three parallel tracks extending qLab with real user identity:

1. **Backend** — Clerk webhooks populate MongoDB users; nickname endpoint; per-user submission history endpoint; submission handle resolved from DB
2. **Web** — Nickname setup page after first sign-in; profile page
3. **Extension** — Welcome prompt on first activation; Examples fused into Description tab; My Submissions tab per problem; open-profile command

---

## Track A — Backend

### New endpoint: `POST /webhooks/clerk`

- File: `api/routers/webhooks.py` (new), registered in `api/main.py`
- Verifies `svix-signature` header using `CLERK_WEBHOOK_SECRET` env var and the `svix` Python package
- Handles `user.created` and `user.updated` events
- Upserts MongoDB `users` collection with: `clerk_user_id`, `email` (primary email address), `display_name` (first + last name), `avatar_url`, `username` (Clerk username or `None`); `nickname` set to `None` on insert, never overwritten on update (user controls it)
- Returns `{"status": "ok"}` — Clerk expects 2xx within 5s
- New dependency: `svix` added to `api/requirements.txt`
- New env var: `CLERK_WEBHOOK_SECRET=whsec_...` added to `.env.example` and `.env`

### Updated: `api/services/users.py`

- `upsert()` signature expanded to accept `avatar_url: str | None`, `username: str | None`; `nickname` initialized to `None` on insert, not touched on update
- New `set_nickname(db, clerk_user_id, nickname) -> None` function: `$set` on `nickname` field only

### New endpoint: `PATCH /users/me/nickname`

- File: `api/routers/users.py`
- Auth-protected via `verify_clerk_token`
- Request body: `{"nickname": "..."}` — non-empty, ≤30 chars (validated in Pydantic model)
- Calls `users_svc.set_nickname()`, returns updated user doc

### New endpoint: `GET /submissions/me`

- File: `api/routers/submissions.py`
- Auth-protected
- Query param: `problem_id: int` (required)
- Returns all submissions for the calling user on that problem, sorted newest-first
- `is_best` flag computed at query time: among correct submissions, the one with lowest `timing_ms` (then `char_count` as tiebreaker) gets `is_best: true`; all others and non-correct submissions get `is_best: false`
- No schema change to the submissions collection

### Updated: `POST /submissions`

- After JWT verify, look up user in MongoDB by `user_id = claims["sub"]`
- Resolve handle: `nickname ?? display_name ?? user_id` (user_id is the Clerk `sub` fallback if webhook hasn't fired yet)
- `handle` field removed from `SubmitRequest` in `api/models.py` (field was `str = "anonymous"`, now gone)
- New Pydantic model `NicknameRequest` in `api/models.py`: `nickname: str` with length validators

---

## Track B — Web

### `/profile/setup` page

- File: `web/app/profile/setup/page.tsx` (new, client component)
- Centered layout: heading "Choose your qLab nickname", single text input, "Save and continue" button
- On submit: calls `PATCH /users/me/nickname` on the FastAPI backend with the Clerk JWT (fetched via `useAuth().getToken()`)
- Validation: non-empty, ≤30 chars shown inline
- On success: reads `from=vscode` query param. If present, triggers `window.location.href = vscode://qlab.qlab/auth?token=<jwt>` and shows "Returning to VS Code...". If absent, redirects to `/profile`.

### Updated: `/auth/callback` page

- After getting the Clerk JWT, call `GET /users/me` on the FastAPI backend
- If user has no `nickname` set: redirect to `/profile/setup?from=vscode` (the JWT is re-fetched in the setup page via `useAuth().getToken()` — no need to pass it in the URL)
- If nickname already set: proceed directly to `vscode://qlab.qlab/auth?token=<jwt>` as before

### `/profile` page

- File: `web/app/profile/page.tsx` (new, client component using `useUser()` from `@clerk/nextjs`)
- Shows: avatar (if available), nickname or display_name, email (greyed out)
- Protected: redirect to `/sign-in` if unauthenticated
- No submission history here — that lives in the extension

### Middleware

- `web/middleware.ts` updated to protect `/profile` and `/profile/setup` routes

### Web env var

- `web/.env.local` gains `NEXT_PUBLIC_API_URL=http://localhost:8000` — used by `/auth/callback` and `/profile/setup` to call the FastAPI backend

---

## Track C — Extension

### Welcome / startup

- In `activate()` in `extension.ts`: check `context.secrets.get('qlab.token')`
- If no token found (first activation or signed out): show `vscode.window.showInformationMessage('Welcome to qLab! Sign in to submit solutions.', 'Sign In')` — clicking "Sign In" triggers `qlab.signIn`
- No webview, no persistent panel — just the one-time notification

### Description tab: Examples fused in

- In `ProblemPanel.ts`: remove the separate Examples tab
- Render examples as a section at the bottom of the Description tab HTML, below the problem narrative
- Each example: input/output shown in `<pre>` blocks, note shown below if present

### My Submissions tab

- New tab added to `ProblemPanel.ts` tab bar: "My Submissions"
- On tab select: calls `GET /submissions/me?problem_id=<id>` with the auth token
- Renders a table: Date, Status, Timing (ms), Chars, Language
- Best submission row: gold star icon (★) prepended to the timing cell, row text bolded
- If unauthenticated (no token or 401): show "Sign in to see your submissions" with a Sign In link
- If no submissions yet: show "No submissions yet for this problem"
- Non-correct submissions (wrong, error, timeout): shown without timing/chars, status cell styled in red

### `qlab.openProfile` command

- New command registered in `extension.ts`: opens `${webUrl}/profile` via `vscode.env.openExternal`
- Registered in `package.json` commands list as `"qlab.openProfile"` / `"Open Profile"`
- Added to the sidebar `view/title` menu (alongside the existing Refresh button) when `view == qlab.problems`

---

## Data model additions

**User document (MongoDB `users` collection):**
```
{
  clerk_user_id: string,   // Clerk sub
  email: string,
  display_name: string,    // first + last from Clerk
  avatar_url: string|null,
  username: string|null,   // Clerk username if set
  nickname: string|null,   // user-chosen, set via PATCH /users/me/nickname
  created_at: datetime
}
```

**Submissions collection:** no schema change. `handle` field already present, now populated from DB not client.

---

## What is not built

- Submission history across all problems (only per-problem in extension)
- Ability to change nickname after setting it (deferred)
- Sign-out command (deferred)
- Web-side submission history (profile page is identity only, no history)
- ngrok setup for local webhook testing (dev ops concern, not coded)
