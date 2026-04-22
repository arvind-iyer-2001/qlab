# qLab — Production Build Spec

> Last updated: 2026-04-22
> Use this document as a prompt when starting the production build. It defines what to build, what decisions are already made, and what to avoid.

---

## What is qLab

A competitive coding platform for kdb+/q developers. Users submit a q function named `func` via a VS Code extension. The backend judges it for correctness, times it, and ranks it on a per-problem leaderboard. Think Leetcode but for q, scored by execution speed then code length.

The **only client** is the VS Code extension (`vscode-extension/`). There is no web frontend and none should be built.

---

## Current codebase (what already exists — do not rewrite unless told)

```
qlab/
├── api/                    # FastAPI backend
│   ├── main.py             # App entrypoint, CORS middleware
│   ├── models.py           # Pydantic models for all request/response types
│   ├── routers/
│   │   ├── problems.py     # GET /problems, GET /problems/:slug, GET /problems/:slug/leaderboard
│   │   ├── submissions.py  # POST /submissions
│   │   └── notebook.py     # POST /notebook/execute, POST /notebook/reset
│   └── services/
│       ├── db.py           # pykx async kdb+ IPC client — TO BE REPLACED with MongoDB
│       ├── judge.py        # q subprocess runner — DO NOT TOUCH
│       └── notebook.py     # kdb+ notebook process manager
├── db/
│   └── schema.q            # kdb+ in-memory submissions table — TO BE REPLACED
├── judge/
│   ├── harness.q           # Judge harness — DO NOT TOUCH
│   └── sandbox.q           # Judge sandbox — DO NOT TOUCH
├── problems/               # One directory per problem
│   └── {slug}/
│       ├── problem.json    # Problem metadata, spec, examples
│       ├── test_gen.q      # Generates judge input x (seeded)
│       └── reference.q     # Canonical correct solution
├── vscode-extension/       # TypeScript VS Code extension — only add auth, do not restructure
└── start.sh                # Dev launcher for all processes
```

### Endpoints the VS Code extension calls

| Method | Path | Purpose |
|---|---|---|
| GET | `/problems` | List all problems (sidebar tree) |
| GET | `/problems/:slug` | Full problem detail (panel) |
| GET | `/problems/:slug/leaderboard?limit=10` | Top submissions (community tab) |
| POST | `/submissions` | Submit a func for judging |
| POST | `/notebook/execute` | Run q code in persistent notebook |
| POST | `/notebook/reset` | Reset notebook state |

Do not remove or rename any of these. New endpoints may be added alongside them.

### The judge pipeline — DO NOT TOUCH

`api/services/judge.py` is the core of the product. It:
1. Validates that `func` takes exactly one parameter (fast Python regex check)
2. Writes a self-contained q script to a temp file, `\l`-loading `test_gen.q` and `reference.q` using absolute paths
3. Spawns `q <tempfile>` as a subprocess with a timeout
4. Parses a single JSON line from stdout
5. Returns a `JudgeResult`

**Do not rewrite this.** The sandboxing work (see below) wraps around it — the pipeline logic itself is correct and battle-tested.

---

## Decisions already made — do not re-litigate

| Decision | Choice | Reason |
|---|---|---|
| Auth provider | Clerk | OAuth (GitHub, Google), JWT, no passwords to store |
| Database | MongoDB with `motor` async driver | Replaces kdb+ for persistence; kdb+ stays for judging only |
| No web frontend | VS Code extension only | Frontend has been removed from the codebase |
| Problem files stay on disk | `test_gen.q` / `reference.q` remain as files | Judge subprocess needs them at runtime |
| Judge isolation | Docker container per submission | Simpler than Linux namespaces; acceptable latency for this use case |
| Deployment | Railway or Render | Python + persistent filesystem for `.q` files |

---

## What to build

Work through these in order. Do not start a later phase before the earlier one is solid.

### Phase 1 — Judge sandboxing (do this first, before anything goes public)

**Why first**: user-submitted q code currently runs with the server's OS permissions. This is a critical security hole.

Wrap the judge subprocess in a Docker container with:
- A non-root restricted user
- No network access (`--network none`)
- Read-only bind mount of the relevant `problems/{slug}/` directory
- Filesystem isolation — no writes outside `/tmp` inside the container
- CPU and memory hard limits (`--cpus`, `--memory`)
- The existing timeout from `QLAB_JUDGE_TIMEOUT` still applies

The container should have q installed and nothing else. The judge writes a temp `.q` file, bind-mounts it into the container, runs `q <file>`, reads stdout. The rest of `judge.py` stays unchanged.

**What to avoid**:
- Do not try to parse or sanitise the q code in Python — q syntax is too complex and you'll miss things. Isolation is the correct approach.
- Do not use a long-running container that accepts submissions over a socket — spawn a fresh container per submission and discard it.

### Phase 2 — MongoDB + motor (replace kdb+ persistence)

Replace `api/services/db.py` (currently pykx IPC to kdb+ port 5000) with `motor` async MongoDB calls.

**Collections**:

```
problems        — mirrors problem.json fields + solve_count
submissions     — problem_id, user_id (Clerk), handle, code, language,
                  status, timing_ms, char_count, submitted_at, error_msg
users           — clerk_user_id, display_name, email, created_at
```

**Migration**: write a one-off script (`scripts/seed_problems.py`) that reads all `problems/*/problem.json` files and upserts them into the `problems` collection. Run this once on deploy.

**Keep** `test_gen.q` and `reference.q` on disk — do not move them to MongoDB. The judge needs them as files.

**Replace `db/schema.q` and `db/` entirely** — once MongoDB is in place, the kdb+ db process (port 5000) is gone. Remove it from `start.sh`.

**What to avoid**:
- Do not use `pykx.SyncQConnection` anywhere — it cannot open sockets off the main thread and will deadlock under FastAPI's threadpool. All db calls must be `async def` with `motor`.
- Do not use `pymongo` (sync driver) — use `motor` exclusively.
- Do not put `test_gen.q` or `reference.q` content into MongoDB — the judge subprocess `\l`-loads them as files and that must remain.

### Phase 3 — Authentication with Clerk

**Backend** (`api/`):

Add FastAPI dependency `verify_clerk_token(token: str = Depends(...))` that:
1. Fetches Clerk's JWKS from `https://api.clerk.dev/v1/jwks`
2. Verifies the JWT signature and expiry
3. Returns the decoded claims (includes `sub` = Clerk user ID)

Cache the JWKS with a short TTL — do not fetch it on every request.

Protect `POST /submissions` with this dependency. All other current endpoints remain public.

Add new endpoints:
- `GET /me` — returns the authenticated user's profile from MongoDB
- `GET /users/:clerk_id/submissions` — submission history for a user

**VS Code extension** (`vscode-extension/`):

Add auth flow:
1. `qlab.signIn` command opens `vscode.env.openExternal` to the Clerk sign-in URL
2. After sign-in, user pastes their session token into a `vscode.window.showInputBox`
3. Token is stored in `vscode.SecretStorage` (not settings — settings are plaintext)
4. All API calls via `QLabApi` attach `Authorization: Bearer <token>`
5. On 401 responses, prompt the user to sign in again

`SubmitRequest` gains a `user_id` field (populated from the verified JWT `sub` claim server-side — never trust the client to send their own user ID).

**What to avoid**:
- Do not roll custom JWT signing — use Clerk's JWKS endpoint for verification
- Do not store tokens in `vscode.workspace.getConfiguration()` — that writes to `settings.json` in plaintext
- Do not make `GET /problems` or `GET /leaderboard` require auth — they must stay public

### Phase 4 — Rate limiting & job queue

Before opening to more than a handful of users:

- Add per-user rate limiting on `POST /submissions` — max N submissions per minute (start with 5)
- Add a Redis-backed job queue (e.g. `arq` or `rq`) so judge processes don't pile up as concurrent subprocesses under load. FastAPI enqueues the job; a worker process runs the judge and writes the result to MongoDB; client polls or uses a webhook.
- Add a global cap on simultaneous judge containers

**What to avoid**:
- Do not use `asyncio.Semaphore` as a production rate limiter — it resets on process restart and doesn't work across multiple workers
- Do not make submissions synchronous once a queue is in place — the judge can take up to 10 seconds and blocking a request thread that long is not acceptable at scale

### Phase 5 — Observability & CI/CD

- Add Sentry for error tracking (`sentry-sdk[fastapi]`)
- Structured JSON logging via Python's `logging` with a JSON formatter — no `print()` statements
- Lock CORS `allow_origins` to the actual deployed domain — remove the `"*"` wildcard
- GitHub Actions workflow: lint → test → deploy to Railway/Render on push to `main`
- API tests covering: judge pipeline (correct submission, wrong answer, timeout, invalid), auth middleware, MongoDB reads/writes

**What to avoid**:
- Do not mock the judge in tests — the judge pipeline has q-specific gotchas (bare `/` block comments, `.z.p` timing, `\l` absolute paths) that only surface with a real q binary. Use a real q process in integration tests.
- Do not test against the kdb+ db — it's being removed. All persistence tests should use a test MongoDB instance.

---

## Hard constraints — always respect these

### q language gotchas

- **Never embed a bare `/` on its own line in a `.q` script string** — in q, a bare `/` starts a block comment that silently swallows everything until `\`. Always `\l`-load files instead of inlining q code.
- **Use `.z.p` for timing, not `\t`** — `\t` is a system command that can't be embedded in a script string. `timing:\`long$1e-6*\`long$.z.p-t0` after `do[1000;func each x]` is equivalent to `\t:1000`.
- **Use `expected~'actual` for correctness, not `expected=actual`** — the `=` operator does atomic equality and fails on lists of strings.
- **Use absolute paths in `\l` calls** — judge scripts run from `/tmp`, so relative paths break.

### FastAPI / pykx

- **All route handlers that touch the database must be `async def`** — pykx's embedded q engine cannot open sockets off the main thread. Once MongoDB replaces kdb+, `motor` requires the same — all db calls are async.
- **Never use `pykx.SyncQConnection`** — it will deadlock under FastAPI's threadpool.

### Submission rules (enforced by `models.py` validators + judge)

- Code must start with `func:` and define a function named `func`
- `func` must take exactly one parameter — `func:{[t;h]...}` is rejected
- Output must match reference exactly (string `"YES"`/`"NO"`, not boolean `1b`)
- Ranking: `timing_ms` ASC, then `char_count` ASC (`-2+count string func`)

### Environment variables (do not hardcode these)

| Var | Purpose |
|---|---|
| `QLAB_Q_BINARY` | Path to q binary |
| `PROBLEMS_DIR` | Absolute path to problems directory |
| `QLAB_NB_PORT` | Notebook q process port (5001) |
| `QLAB_JUDGE_TIMEOUT` | Seconds before judge kills subprocess |
| `MONGODB_URI` | MongoDB connection string |
| `CLERK_SECRET_KEY` | Clerk secret for JWT verification |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint URL |

---

## What to avoid — summary

| Do not | Why |
|---|---|
| Build a web frontend | VS Code extension is the only client |
| Touch `api/services/judge.py` logic | It works; sandboxing wraps around it |
| Touch `judge/harness.q` or `judge/sandbox.q` | Core judge logic, already correct |
| Use `pykx.SyncQConnection` | Deadlocks off the main thread |
| Use `pymongo` (sync) | Use `motor` (async) only |
| Store Clerk tokens in VS Code settings | Plaintext — use `vscode.SecretStorage` |
| Roll custom JWT verification | Use Clerk's JWKS endpoint |
| Trust client-sent `user_id` in submissions | Derive it from the verified JWT server-side |
| Mock the judge in tests | q-specific bugs only surface with a real binary |
| Use `asyncio.Semaphore` as a rate limiter | Doesn't persist across restarts or workers |
| Embed bare `/` lines in q script strings | Starts a block comment, silently breaks the script |
| Use relative paths in `\l` calls | Scripts run from `/tmp`, relative paths break |
| Remove or rename existing API endpoints | VS Code extension depends on all of them |
