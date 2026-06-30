# qLab Session Handoff — 2026-06-19

Continues from `2026-06-18-resilience-fixes-handoff.md`. Covers: shipping the 5
resilience fixes, web onboarding fix, local webhook testing setup, and a DB/Clerk
reset to a clean slate.

## Branch / PR state

- `main` @ `b91a2a8` — unchanged this session.
- `staging` @ `9010021` — integration branch, **14 commits ahead of main**.
  Holds all 5 resilience fixes + the web onboarding fix. CI green.
- **PR #8** `staging → main` — OPEN. The single gate to promote everything to
  `main`. Its body lists only the 5 resilience fixes but it now ALSO carries the
  onboarding fix (PR #9) — update the body before merging if that matters.

Merged into `staging` this session (feature branches deleted):
- #2 issue 3 — warn on missing/invalid `QLAB_LICENSE_B64` at startup
- #3 issue 1 — anonymize submissions on user delete (cascade)
- #4 issue 2 — `DELETE /users/me/license` + friendly expired-license remap
- #5 issue 4 — `/execute` multi-statement eval
- #6 issue 5 — in-process HTTP smoke test + GitHub Actions CI (+ auth 403→401)
- #9 — reliable web nickname onboarding (web-aware callback + `OnboardingGate`)

CI note: the GitHub Actions workflow lives on `staging` only (came in via #6).
A `pull_request` runs CI only if the PR's head branch contains `.github/workflows/ci.yml`.
So feature branches must be **based on / rebased onto `staging`** to get checks —
branching off `main` yields "no checks reported". This is how #9 was made to run CI.
CI command is `uv run pytest -v -ra --cov=api --cov-report=term-missing` (53 tests).

## What was verified live (not just unit tests)

Backend run cmd (PYTHONPATH needed — interpreter reads it before `load_dotenv`):
`PYTHONPATH=$PWD/api uv run uvicorn api.main:app --port 8000 --reload`

- **Issue 1 anonymize — VERIFIED end to end.** Seeded a submission, POSTed a
  real svix-signed `user.deleted` to `/webhooks/clerk` (200, signature verified).
  Result in Mongo: submission `handle` → `[deleted]`, row kept, `status` intact,
  user doc removed. Backend logged
  `Deleted user … — anonymized 1 submission(s), removed 1 user doc`.
- **`user.created` — VERIFIED.** Web sign-up → Clerk → Svix relay → backend (200)
  → Mongo user doc created (Atlas).
- **Auth — VERIFIED.** `/users/me` returns 401 (not 403) with no/garbage token
  (the #6 fix); JWKS endpoint reachable (200).

## Local webhook testing setup (Svix relay)

- Svix CLI installed via `npm install -g svix-cli`.
- Reusable Play inbox token **`c_3GN5z5xK0U`** → `https://play.svix.com/in/c_3GN5z5xK0U/`.
- Run: `svix listen --token c_3GN5z5xK0U http://localhost:8000/webhooks/clerk`
  (was running in the background this session; restart if the shell is gone).
- Flow: Clerk → Play URL → relay → `localhost:8000/webhooks/clerk`. Relay
  forwards raw, so `CLERK_WEBHOOK_SECRET` in `.env` must equal the Clerk
  endpoint's `whsec_…` (it does: `whsec_l2q+VO…`).

## OPEN ISSUE — Clerk dashboard webhook subscription

`user.created` reaches the relay but `user.deleted` does NOT. The Clerk webhook
endpoint is missing the `user.deleted` event subscription. **Config, not code** —
the anonymize code is proven correct (above). Fix in Clerk dashboard → Webhooks →
endpoint `https://play.svix.com/in/c_3GN5z5xK0U/` → Subscribed events → enable
`user.deleted` (and `user.updated`). Until then, prod deletes won't cascade.

## Clean slate (done at end of session)

- Mongo `submissions`: 0 · `users`: 0 · `hint_reveals`: 0
- Mongo `problems`: 7 preserved, all `solve_count` = 0
- Clerk users: 0
- Clerk instance is **test** (`sk_test_`/`pk_test_`), dev only — no production
  instance configured.

## Env facts (verified)

- Python env uses **uv** (`uv venv`, `uv pip install -r api/requirements.txt`,
  `uv run pytest`). Not bare pip/venv. No pytest in system python 3.14.
- Mongo is **Atlas** (`MONGODB_URI` in `.env` → `qlab.5buhwke.mongodb.net`),
  not localhost. `mongosh` installed (2.8.3) for inspection.
- `CLERK_JWKS_URL` = `https://curious-toucan-47.clerk.accounts.dev/...`.
- Web frontend: `next build` clean, runs on :9091; `NEXT_PUBLIC_API_URL` =
  `http://localhost:8000`. Clerk `AFTER_SIGN_IN/UP_URL` = `/auth/callback`.

## Remaining test targets (not yet exercised live)

- Issue 2: `DELETE /users/me/license` cycle + expired-license stderr remap
  (remap needs an actually-expired license in q/docker).
- Issue 4: `/execute` multi-statement via the Test tab / curl (verified locally
  against a q binary earlier, not via the running stack this session).
- Web onboarding (#9): manual — fresh sign-up should now land on `/profile/setup`;
  direct nav to `/problems` with no nickname should bounce to setup.

## Untracked files in the tree

- `.coverage` — from `pytest --cov` runs; gitignore or delete.
- `docs/superpowers/specs/2026-06-18-resilience-fixes-handoff.md` — prior handoff.
