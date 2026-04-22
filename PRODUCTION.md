# qLab — Production Readiness Plan

Scope document for migrating qLab to a production-grade backend with MongoDB and Clerk authentication.

---

## Current architecture (dev-only)

```
Browser → Vite (5173) → proxy /api/* → FastAPI (8000) → kdb+ db (5000)
                                              ↓
                                    q judge subprocess (per submission)
```

- **Persistence**: in-memory kdb+ `submissions` table, flushed to `db/data/submissions` on disk
- **Problem metadata**: filesystem JSON files (`problems/{slug}/problem.json`)
- **Auth**: none
- **Deployment**: local only

---

## Target architecture

```
Browser / VS Code extension
        ↓  (JWT via Clerk)
    FastAPI (8000)
        ↓            ↓
  MongoDB Atlas   q judge subprocess
  (motor async)   (unchanged)
```

---

## What changes

### 1. Database — MongoDB

Replace kdb+ persistence and filesystem JSON with four collections:

| Collection | Contents |
|---|---|
| `problems` | narrative, input/output spec, hints, difficulty, concepts, public examples, posted_date |
| `test_cases` | hidden test inputs/outputs per problem (linked by problem id) |
| `submissions` | user id, problem id, code, status, timing_ms, char_count, submitted_at |
| `users` | Clerk user id, display name, email, solve counts, join date |

**What stays on disk**: `test_gen.q` and `reference.q` per problem — the judge subprocess needs them at runtime. Test case *results* move to Mongo; the q scripts stay on the filesystem.

**Migration**: a one-off seed script imports the existing 4 problems from JSON files into MongoDB on first deploy.

**Driver**: replace `pykx` for persistence with `motor` (async MongoDB driver). The `pykx` import for the judge subprocess is unaffected.

### 2. Authentication — Clerk

Clerk handles OAuth (GitHub, Google, etc.), session management, and JWT issuance. No passwords stored.

- **Frontend**: `@clerk/clerk-react` — wrap app in `<ClerkProvider>`, add `<SignIn>` / `<UserButton>` components, protect routes
- **Backend**: FastAPI middleware verifies Clerk JWTs on protected endpoints using Clerk's public JWKS endpoint
- **VS Code extension**: auth flow opens a browser to Clerk sign-in, token stored in `vscode.SecretStorage`, attached as `Authorization: Bearer <token>` on submit requests

Protected endpoints (require auth):
- `POST /submissions`
- `GET /me`
- `GET /users/:id/submissions`

Public endpoints (no auth):
- `GET /problems`
- `GET /problems/:slug`
- `GET /leaderboard`

### 3. API changes

- All submission routes require a valid Clerk JWT
- New routes: `GET /me`, `GET /users/:id/submissions`, paginated `GET /leaderboard`
- Replace `pykx.AsyncQConnection` db calls with `motor` async calls
- Problem metadata served from MongoDB instead of filesystem JSON reads

### 4. Frontend changes

- Clerk provider wrapping the React app
- Sign-in page with OAuth buttons (configured in Clerk dashboard — no code changes for adding new providers)
- Submission history per user on the problem page
- User profile page
- Richer leaderboard (usernames, avatars from Clerk)

### 5. VS Code extension changes

- Auth flow: `vscode.env.openExternal` → Clerk sign-in → user pastes token back (or device code flow)
- `vscode.SecretStorage` for token persistence
- Token attached to all submit requests

---

## What stays the same

- q judge subprocess pipeline — temp `.q` file written, stdout captured, JSON parsed
- `test_gen.q` / `reference.q` files on disk
- Vite SPA structure, Monaco editor, q tokenizer

---

## Open decisions

### kdb+ licensing
The personal/non-commercial kdb+ license restricts production use. Options:
- Keep kdb+ for judging only (subprocess, not a server) — may fall within personal use
- Replace the kdb+ *db process* (port 5000) with MongoDB entirely and keep kdb+ only for the judge subprocess
- Purchase a commercial kdb+ license if this becomes a real product

### Deployment target
Recommended stack:
- **MongoDB**: Atlas free tier (512 MB) to start, scales up as needed
- **App**: Railway or Render — supports Python + persistent filesystem for the `.q` files
- **Frontend**: same host or Vercel/Netlify

### Admin interface
Currently problems are authored by writing JSON + q files directly. Options:
- Keep filesystem authoring (simpler, no UI needed)
- Build a basic admin panel for problem CRUD via the API

### Leaderboard scope
- Global only (across all problems)?
- Per-problem rankings?
- Both?

---

## Rough effort estimate

| Area | Effort |
|---|---|
| MongoDB schemas + motor async setup | Small |
| Problem seed/migration script | Small |
| Clerk backend JWT middleware | Small |
| Clerk frontend integration | Small |
| API route updates (submissions, users) | Medium |
| User profile + submission history UI | Medium |
| VS Code extension auth flow | Medium |
| Deployment config + env management | Medium |
| Admin problem management UI | Large (if needed) |

**Total without admin UI**: 2–3 focused sessions.

---

## Suggested order of work

1. MongoDB setup + motor driver + problem migration script
2. Clerk backend middleware + protect submission routes
3. Clerk frontend integration (sign-in, user button)
4. User profile + submission history
5. VS Code extension auth
6. Deployment
