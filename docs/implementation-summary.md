# Implementation Summary

Covers the MongoDB migration (Phase 2) and Clerk authentication (Phase 3) implemented in this session. Each section documents what was built and the challenges encountered.

---

## Phase 2 — MongoDB Migration

### What was built

Replaced the kdb+ in-memory database (port 5000) with MongoDB Atlas via the `motor` async driver. Three focused service modules were created (`services/problems.py`, `services/submissions.py`, `services/users.py`) backed by a single `AsyncIOMotorClient` initialised in FastAPI's lifespan and injected via a `get_db` dependency. A one-off seed script (`scripts/seed_problems.py`) reads all `problems/*/problem.json` files and upserts them into MongoDB, also creating the required indexes.

### Challenges

**PYTHONPATH complexity with flat imports**

The `api/` directory uses flat imports (`from models import ...`, `from deps import get_db`) because `PYTHONPATH` includes `api/` at runtime. Tests, however, need to import with the full path (`from api.services.auth import ...`) because PYTHONPATH is the repo root. Solved by adding `pythonpath = . api` to `pytest.ini`, which makes both styles resolve correctly without setting PYTHONPATH manually before every command. An empty `api/__init__.py` was also needed to make `api` a proper importable package from the repo root.

**`solve_count` denormalisation**

The `problems` collection stores a `solve_count` field that is incremented atomically with `$inc` on every correct submission. The seed script uses `$setOnInsert` to initialise it to 0 on first upsert, so re-running the seeder doesn't reset counts accumulated from real submissions.

**Validator rejecting solution files with comment headers**

The VS Code extension creates solution files with a header block of q comments describing the problem (title, difficulty, test call, etc.) followed by the `func:` definition. The `code_must_define_func` Pydantic validator was checking `stripped.startswith("func:")` after only stripping whitespace, so any file with a comment header was rejected with "Submission must start with 'func:'". Fixed by filtering out lines that start with `/` (q comment character) and blank lines before the check, then joining the remaining lines as the cleaned code sent to the judge.

**Judge outputting `error_runtime` status not in the enum**

The judge script outputs `"error_runtime"` and `"error_parse"` as status values for runtime and parse errors respectively, but `SubmissionStatus` only has `"error"`. This was discovered when testing a malformed submission. Not fixed in this session (the affected code path is in `judge.py` which is marked do-not-touch); working around it by testing only with valid q submissions.

---

## Phase 3 — Clerk Authentication

### What was built

Three-component auth flow:

1. **Next.js web app** (`web/`) — minimal sign-in and sign-up pages using Clerk's `<SignIn>` and `<SignUp>` components, plus an `/auth/callback` client page that calls `useAuth().getToken()` and redirects to `vscode://qlab.qlab/auth?token=<jwt>`.
2. **FastAPI middleware** — `verify_clerk_token` dependency using `PyJWKClient` (PyJWT 2.x) for RS256 JWT verification against Clerk's JWKS endpoint. JWKS is cached by the client. Protects `POST /submissions` and `GET /users/me`.
3. **VS Code extension** — `qlab.signIn` command opens the Next.js sign-in page in the browser. A URI handler on the `vscode://qlab.qlab/auth` path captures the token and stores it in `SecretStorage`. `QLabApi.post()` attaches `Authorization: Bearer <token>` on every request. 401 responses prompt the user to sign in again.

### Challenges

**FastAPI `HTTPBearer` returns 401 not 403**

The plan specified that an unauthenticated request to a protected endpoint would return 403 (the behaviour of older FastAPI versions). The installed version (0.115.0) changed `HTTPBearer` to return 401 with `{"detail": "Not authenticated"}`. The test assertion and plan comment were updated accordingly.

**Clerk v5 middleware API: `auth().protect()` not `auth.protect()`**

In `@clerk/nextjs` v5, `clerkMiddleware` receives `auth` typed as `ClerkMiddlewareAuth`, which is a callable — calling `auth()` returns the auth object, and `.protect()` is a method on that object. The plan's version used `async (auth, request) => { await auth.protect() }`, which the TypeScript compiler rejected. The correct v5 syntax is the synchronous `(auth, request) => { auth().protect() }`. Confirmed by inspecting the installed type definitions.

**`context.secrets.get()` is `Thenable` not `Promise`**

The VS Code API types `context.secrets.get()` as `Thenable<string | undefined>`, not `Promise<string | undefined>`. `QLabApi`'s `getToken` parameter is typed as `() => Promise<string | undefined>`. TypeScript rejected the direct assignment. Worked around with `() => Promise.resolve(context.secrets.get(TOKEN_KEY))`. The `Thenable` interface is compatible at runtime but not at the type level without the wrapper.

**Double-post to webview on unauthorized submit**

The initial implementation of the `unauthorized` handler in `ProblemPanel._handleSubmit` posted `submitResult` to the webview (rendering an error panel) and then showed the native "Sign In" VS Code dialog. This caused two simultaneous error UIs. The fix was to remove the webview post entirely for the `unauthorized` case — only the native dialog is shown, and the webview stays in its previous state until the user signs in and resubmits.

**Clerk JWT token expiry**

Clerk session tokens expire in approximately 60 seconds. There is no background refresh mechanism in the VS Code extension. The chosen approach is graceful degradation: when a token expires the next submission returns 401, the extension shows "Please sign in" with a "Sign In" button, and the user re-authenticates. A long-lived token via a Clerk JWT template (configurable in the Clerk dashboard) could extend this to days if the short expiry becomes a friction point.

**`pytest-asyncio` version drift**

`requirements.txt` pinned `pytest-asyncio==0.24.0` but `1.3.0` was installed. The tests passed because the major version bump maintained backward compatibility, but the mismatch would cause a fresh `pip install -r requirements.txt` to install the wrong version. Updated the pin to `1.3.0` to match what was tested against.

---

## Phase 4 — User Registration, Nicknames & Submission History

### What was built

Three-component implementation adding real user identity to qLab:

**Backend (`api/`)**

- `POST /webhooks/clerk` — Svix-signature-verified endpoint that receives Clerk `user.created` and `user.updated` events and upserts the user into MongoDB with their real name, email, avatar URL, and username. The webhook secret is read per-request (not at module load time) to avoid import-order dependencies with `load_dotenv`.
- `PATCH /users/me/nickname` — auth-protected endpoint for users to choose their leaderboard handle. Includes a pre-upsert stub creation to handle the race where the Clerk webhook hasn't fired yet at first sign-in.
- `GET /submissions/me?problem_id=X` — returns all of the calling user's submissions for a specific problem, sorted newest-first, with an `is_best` flag computed at query time (lowest `timing_ms`, then `char_count` as tiebreaker among correct submissions only). Uses an explicit MongoDB field projection to avoid returning `code`, `error_msg`, and `user_id` to the client.
- `POST /submissions` — handle is now resolved server-side from the user's MongoDB profile (`nickname → display_name → user_id` fallback). The `handle` field was removed from `SubmitRequest`. Handles the webhook-not-yet-fired case by falling back to the Clerk `sub` claim.

**Web (`web/`)**

- `/profile/setup` — nickname registration form shown after first sign-in. Calls `PATCH /users/me/nickname` with the Clerk JWT. Redirects to VS Code (`vscode://qlab.qlab/auth?token=…`) on success when navigated from the auth callback, or to `/profile` otherwise.
- `/auth/callback` — updated to call `GET /users/me` before completing the VS Code redirect. If the user has no nickname yet, redirects to `/profile/setup?from=vscode` instead. If the API is unreachable, proceeds to VS Code anyway (graceful degradation).
- `/profile` — minimal profile page showing avatar, display name, and email from Clerk's client SDK. Redirects unauthenticated users to `/sign-in`.

**VS Code extension (`vscode-extension/`)**

- `api.ts` — added `UserSubmission` interface, a private `authGet<T>` helper (adds `Authorization` header, returns `null` on 401/403 or missing token), and `getMySubmissions(problemId)`. Removed `handle` from `submitSolution` signature and request body.
- `ProblemPanel.ts` — Examples content moved inline into the Description tab (after hints). A new **My Submissions** tab replaces the old Examples tab: shows a table of the user's submissions for that problem with date, status, timing, chars, language, and a ★ gold star on the best correct submission. Handle input field removed from the Submit tab.
- `extension.ts` — one-time welcome prompt on first activation (gated behind `context.globalState` so it doesn't fire on every restart). New `qlab.openProfile` command opens `${webUrl}/profile` in the browser. Fixed the `signIn` command's stale `localhost:3000` fallback to `localhost:9091`.
- `package.json` — `qlab.openProfile` registered with a `$(account)` icon and added to the sidebar `view/title` menu.

### Challenges

**`useSearchParams` requires Suspense in Next.js 14 App Router**

`/profile/setup` uses `useSearchParams()` to detect the `?from=vscode` query param. In Next.js 14, any `'use client'` component calling `useSearchParams()` must be wrapped in a `<Suspense>` boundary or the build fails with a hard error. The plan's code snippet omitted this. The fix was to extract the page body into a `ProfileSetupInner` component and wrap the default export in `<Suspense>`.

**Clerk webhook secret read at module load time**

The initial implementation assigned `CLERK_WEBHOOK_SECRET = os.getenv(...)` at module level. Since `load_dotenv()` is called in `main.py` before the routers are imported, this is safe in the current structure — but it creates a brittle import-order dependency. Moved the `os.getenv` call inside the request handler so the secret is always read after `load_dotenv()` has run, regardless of import order.

**`is_best` with `None` timing**

The plan's draft used `r.get("timing_ms") or 0` to handle missing timing values, which would incorrectly make an unrankable submission (one where the judge produced no timing) appear to beat real submissions with `timing_ms=100`. Fixed by using a `continue` guard — any correct submission with `timing_ms=None` or `char_count=None` is skipped in the best-selection loop entirely.

**MongoDB projection exposing internal fields**

The initial `get_for_user` query used `{"_id": 0}` as the projection, which still returned `code`, `error_msg`, and `user_id` in every row. Pydantic's `response_model` silently strips undeclared fields at serialisation time, so the API response was safe — but raw dicts flowing through the Python layer contained those fields. Replaced with an explicit field allowlist matching the `MySubmissionEntry` model.

**Welcome prompt firing on every activation**

The plan said "show welcome prompt once if not signed in," meaning a one-time prompt on first install. The initial implementation checked the token on every `activate()` call, so the prompt fired every time VS Code restarted while the user was signed out. Fixed by gating on `context.globalState.get('qlab.welcomed')` — the flag is set on first activation and never cleared, so the prompt appears exactly once regardless of sign-in state.

**`set_nickname` silently no-ops on missing user document**

`users_svc.set_nickname` uses `update_one` without `upsert=True`. If a user calls `PATCH /users/me/nickname` before the Clerk `user.created` webhook has been delivered (a realistic race on first login), the MongoDB update matches zero documents and the subsequent `get_by_clerk_id` returns `None`, causing a 404. Fixed by adding an explicit user lookup at the start of the PATCH handler — if the user document doesn't exist, an empty stub is upserted before the nickname is set.

---

## Known Gaps (deferred)

| Gap | Notes |
|---|---|
| `error_runtime` / `error_parse` not in `SubmissionStatus` | Judge outputs these; Python raises `ValueError` on parse. Not fixed — `judge.py` is do-not-touch. |
| Clerk JWT short expiry (~60s) | Acceptable for now; Clerk JWT templates can extend this |
| No `qlab.signOut` command | Users must clear SecretStorage manually; 401 → re-sign-in covers the expired-token case |
| `CLERK_SECRET_KEY` unused in Python | Added to `.env` for future Clerk REST API calls (user metadata, webhooks) |
| `/auth/callback` doesn't check `isSignedIn` | Protected by middleware; direct navigation without a session redirects to `/sign-in` |
| Nickname uniqueness not enforced | Two users can choose the same nickname; leaderboard shows duplicate handles |
| No MongoDB indexes on `users.clerk_user_id` or `submissions.{user_id, problem_id}` | Collection scans on every `/me` and `/submissions/me` call; fine at current scale |
| `openProfile` visible to unauthenticated users | No VS Code context key for auth state; clicking it opens the Clerk-protected profile page which redirects to sign-in |
| My Submissions tab doesn't auto-load on panel open | Data is only fetched when the tab is clicked; avoids a redundant API call but leaves the pane blank until clicked |
| Nickname cannot be changed after setting | No UI or endpoint for updating an existing nickname; would require a separate settings flow |
| No `user.deleted` webhook handling | Clerk fires this event but the endpoint ignores it; user documents are never removed |
| Web profile page shows Clerk data only | MongoDB `nickname` is not displayed on `/profile`; requires a `GET /users/me` call from the web layer |
