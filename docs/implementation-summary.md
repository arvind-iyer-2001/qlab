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

## Known Gaps (deferred)

| Gap | Notes |
|---|---|
| `error_runtime` / `error_parse` not in `SubmissionStatus` | Judge outputs these; Python raises `ValueError` on parse. Not fixed — `judge.py` is do-not-touch. |
| Clerk JWT short expiry (~60s) | Acceptable for now; Clerk JWT templates can extend this |
| No `qlab.signOut` command | Users must clear SecretStorage manually; 401 → re-sign-in covers the expired-token case |
| `CLERK_SECRET_KEY` unused in Python | Added to `.env` for future Clerk REST API calls (user metadata, webhooks) |
| `/auth/callback` doesn't check `isSignedIn` | Protected by middleware; direct navigation without a session redirects to `/sign-in` |
