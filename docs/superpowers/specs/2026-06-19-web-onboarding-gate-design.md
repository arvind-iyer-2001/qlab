# Web Onboarding Gate — Design

Date: 2026-06-19
Status: approved, not yet implemented
Scope: web frontend only (`web/`). No backend changes. VS Code extension untouched.

## Problem

New web users are not prompted for a nickname (and optional license) on first
sign-in. The onboarding page (`web/app/profile/setup/page.tsx`) still exists and
still collects nickname + base64 license, but it is only ever reached through
`web/app/auth/callback/page.tsx`, which is VS-Code-centric and brittle:

- The callback **hardcodes** `?from=vscode` when redirecting to setup, so the
  origin signal is fake — every user (web or VS Code) gets VS-Code treatment.
- On the success-with-nickname path, and on any `/users/me` error/exception,
  the callback sends the browser to `vscode://qlab.qlab/auth?token=…` — which
  does nothing visible for a pure web user.
- The `404 → setup` branch is dead: `GET /users/me` now auto-creates a
  `nickname:null` doc via `get_or_create` and returns 200, so it never 404s.
- Nothing else gates onboarding: `middleware.ts` only checks auth, the home
  page is static marketing, and `/profile` shows "No nickname set" inline
  without forcing setup.

Net effect: onboarding is a one-shot at the callback. If a user is already
signed in, closes the tab, or the backend hiccups, they are never prompted
again and keep `nickname:null` forever.

## Decision

Approach **C**, web-only variant ("default to web"): fix the callback to be
web-aware **and** add a durable, path-independent onboarding gate. Keep the
`from=vscode` capability for forward compatibility (when the extension is later
updated to pass it), but absent the param treat everyone as a web user.

## Part B — Web-aware callback

File: `web/app/auth/callback/page.tsx`.

- Read the real origin: `const fromVscode = searchParams.get('from') === 'vscode'`
  (stop hardcoding `from=vscode`). Requires wrapping the component in a
  `Suspense` boundary for `useSearchParams` (same pattern as `profile/setup`).
- After `GET /users/me`:
  - **no nickname** → redirect to `/profile/setup`, preserving `?from=vscode`
    only when it is actually present.
  - **has nickname** → `fromVscode ? vscode://… : /problems`.
  - **fetch threw or response not OK** → `fromVscode ? vscode://… : /problems`
    (Part A's gate will catch a still-missing nickname on `/problems`).
- Remove the dead `res.status === 404` branch.

## Part A — Durable onboarding gate

File: `web/components/OnboardingGate.tsx` (new), mounted in `web/app/layout.tsx`
inside the existing `ClerkProvider`.

Behavior:

- Client component. Uses Clerk `useUser` (for `isSignedIn`/`isLoaded`) and
  `useAuth` (`getToken`), plus `usePathname`/`useRouter`.
- No-op when Clerk is not loaded or the user is signed out — the marketing home
  page stays public for anonymous visitors.
- **Excluded paths** (never redirect away from these): `/sign-in`, `/sign-up`,
  any `/auth/*`, `/sign-out`, `/profile/setup`. Match by prefix.
- Otherwise: `GET ${NEXT_PUBLIC_API_URL}/users/me` with the bearer token; if the
  response is OK and `nickname == null`, `router.replace('/profile/setup')`.
- Re-runs when `pathname` changes (and once Clerk finishes loading), so it
  catches already-signed-in sessions, reopened tabs, and post-hiccup states the
  one-shot callback missed.
- On fetch error: do nothing (fail open — don't trap the user in a redirect
  loop if the API is down).

## Components and boundaries

- `OnboardingGate` — single purpose: redirect signed-in, nickname-less users to
  setup. Renders `null`. Depends on Clerk hooks + the `/users/me` endpoint.
  Testable in isolation by its inputs (auth state, pathname, API response).
- Callback page — single purpose: route a just-authenticated user to the right
  next destination (setup / app / VS Code). Depends on `/users/me` + the `from`
  query param.

The two do not double-fire: the gate excludes `/auth/*`, which is where the
callback runs.

## Data flow

```
sign-in/up ──Clerk──▶ /auth/callback ──GET /users/me──▶
    no nickname  → /profile/setup
    nickname     → /problems        (web)   |  vscode://…  (from=vscode)
    error        → /problems        (web)   |  vscode://…  (from=vscode)

any authed route ─▶ OnboardingGate ─GET /users/me─▶ nickname==null → /profile/setup
```

## Error handling

- Callback `/users/me` error → web users go to `/problems`; the gate re-checks
  there and redirects to setup if nickname is still null.
- Gate `/users/me` error → fail open (no redirect), avoiding loops when the API
  is unreachable.

## Testing

- No backend changes; existing `pytest` suite is unaffected.
- The gate and callback are client-side routing; verification is manual:
  1. Fresh web sign-up with no nickname → lands on `/profile/setup`.
  2. Save nickname → proceeds (existing setup behavior).
  3. Sign in as a user with a nickname → lands on `/problems`, no setup.
  4. Signed-in nickname-less user navigating directly to `/problems` → bounced
     to `/profile/setup` by the gate.
  5. Anonymous visitor on `/` → no redirect.

## Out of scope

- VS Code extension changes (it keeps opening `/sign-in` with no `from`).
- The setup page's own post-submit redirect (`/profile`) is left as-is.
- Backend / auth changes.
