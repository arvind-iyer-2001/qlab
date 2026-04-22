# qLab — Production Readiness Plan

> Last updated: 2026-04-22

---

## Current state (MVP)

```
VS Code extension → FastAPI (8000) → kdb+ db (5000)
                          ↓
                  q judge subprocess (per submission)
                  q notebook process (5001, persistent)
```

- **Persistence**: in-memory kdb+ `submissions` table, flushed to `db/data/` on disk
- **Problem metadata**: filesystem JSON files (`problems/{slug}/problem.json`)
- **Auth**: none — handles are freeform strings, anyone can submit as anyone
- **Judge isolation**: none — user code runs as a subprocess with full OS permissions
- **Deployment**: local only

---

## The real gaps

### 1. Judge sandboxing — most urgent

User-submitted q code runs in a subprocess with **no isolation**. Someone can submit `func:{system "rm -rf /"}` and it executes with the server process's permissions. This must be resolved before any public-facing URL exists.

Needs:
- A restricted OS user or Linux namespaces for judge execution
- Filesystem isolation: no network access, no disk writes, read-only problem files only
- CPU and memory hard limits beyond just a timeout

Options: Docker-per-submission (simple, slow), Linux namespaces/seccomp (fast, complex), or a dedicated sandboxed worker service.

### 2. Identity & authentication

No auth at all — anyone can submit as anyone. Needs Clerk (or equivalent) for OAuth-backed identity before real users are involved. Also requires a decision: **invite-only** (kdb+ community is small and known) or **open registration**?

Clerk handles OAuth (GitHub, Google, etc.), session management, and JWT issuance:
- **Backend**: FastAPI middleware verifying Clerk JWTs via the public JWKS endpoint
- **VS Code extension**: auth flow via `vscode.env.openExternal`, token stored in `vscode.SecretStorage`, attached as `Authorization: Bearer` on all requests

Protected endpoints (require auth):
- `POST /submissions`
- `GET /me`
- `GET /users/:id/submissions`

Public endpoints:
- `GET /problems`, `GET /problems/:slug`
- `GET /problems/:slug/leaderboard`

### 3. kdb+ licensing

The personal licence explicitly prohibits production/commercial use. This is a hard external blocker. Options:

- **Reach out to KX** — they've done community deals before; worth asking before assuming the worst
- **Narrow the scope**: keep kdb+ only for the judge subprocess (not as a persistence server) and argue it's a dev tool
- **Commercial licence**: required if this becomes a real product with paying users

### 4. Persistence — MongoDB

The kdb+ db is in-memory with disk snapshots. A crash mid-write loses data; it also doesn't scale past one process. Replace with MongoDB:

| Collection | Contents |
|---|---|
| `problems` | narrative, spec, hints, difficulty, concepts, examples, posted_date |
| `test_cases` | hidden test inputs/outputs per problem |
| `submissions` | user id, problem id, code, status, timing_ms, char_count, submitted_at |
| `users` | Clerk user id, display name, email, solve counts, join date |

`test_gen.q` and `reference.q` stay on disk — the judge subprocess needs them at runtime. Replace `pykx.AsyncQConnection` for persistence with `motor` (async MongoDB driver).

Migration: a one-off seed script imports the existing 4 problems from JSON files into MongoDB on first deploy.

### 5. Rate limiting & abuse prevention

No throttling on submissions. A user can spam judge processes and take down the server. Needs:
- Per-user rate limits on `POST /submissions`
- A job queue (e.g. Redis + worker) so submissions don't pile up as concurrent subprocesses
- Global concurrency cap on simultaneous judge processes

### 6. Reliability & observability

- No error tracking — errors go to stdout and disappear
- No uptime monitoring
- No structured logging
- CORS is currently `allow_origins=["*"]` — needs locking to the actual domain

Minimum bar: Sentry for error tracking, structured logs, a health check that actually tests kdb+ connectivity.

### 7. CI/CD

Everything is manual. Needs at minimum:
- A test suite for the API (judge pipeline especially)
- A build + deploy pipeline (GitHub Actions → Railway/Render)
- Environment-based config (dev / staging / prod)

---

## Priority order

| Priority | Item |
|---|---|
| Before any public URL | Judge sandboxing, auth, rate limiting |
| Before real users | kdb+ licensing resolved, MongoDB, CORS locked |
| Should-have early | Error tracking, structured logging, CI/CD |
| Can wait | Admin UI, email notifications, global leaderboard |

---

## Deployment target

- **MongoDB**: Atlas free tier (512 MB) to start
- **App**: Railway or Render — supports Python + persistent filesystem for `.q` files
- **kdb+ judge**: runs as a subprocess on the same host; no separate deployment needed

---

## Open decisions

| Decision | Options |
|---|---|
| Invite-only vs open registration | Invite-only is safer to start; open later |
| Judge isolation approach | Docker-per-submission vs Linux namespaces |
| kdb+ licensing | Contact KX vs narrow usage vs commercial licence |
| Admin interface | Filesystem authoring (current) vs API-backed admin panel |
| Leaderboard scope | Per-problem only vs global across all problems |

---

## Suggested order of work

1. **Judge sandboxing** — resolve before anything goes public
2. **kdb+ licensing** — contact KX in parallel; unblocks everything else
3. **MongoDB + motor** — replace kdb+ persistence, seed existing problems
4. **Clerk auth** — backend JWT middleware + VS Code extension auth flow
5. **Rate limiting + job queue** — before opening to more than a handful of users
6. **CI/CD + observability** — Sentry, structured logs, GitHub Actions deploy
7. **Admin tooling** — only if filesystem authoring becomes a bottleneck
