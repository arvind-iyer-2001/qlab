# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

qLab — a competitive coding platform for kdb+/q developers. Users submit a q function named `func` that is auto-judged for correctness then speed. Think Leetcode but for q, with timing (`\t:1000`) and code length (`-2+count string func`) as the scoring metrics.

## Starting the stack

```bash
cd ~/qlab
./start.sh          # launches notebook q (5001) + FastAPI (8000)
```

Individual processes:
```bash
# Notebook q process (persistent, stateful)
/home/aiyer/.kx/bin/q -p 5001 -q

# FastAPI
PROBLEMS_DIR=/home/aiyer/qlab/problems \
QLAB_Q_BINARY=/home/aiyer/.kx/bin/q \
QLAB_NB_PORT=5001 \
MONGODB_URI=mongodb://localhost:27017 \
MONGODB_DB=qlab \
PYTHONPATH=/home/aiyer/qlab/api \
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Seed problems into MongoDB on first run (idempotent, safe to re-run):
```bash
python3 scripts/seed_problems.py
```

API docs at `http://localhost:8000/docs`.

## Key env vars

| Var | Default | Purpose |
|---|---|---|
| `QLAB_Q_BINARY` | `q` | Path to q binary — on this machine: `/home/aiyer/.kx/bin/q` |
| `PROBLEMS_DIR` | `/problems` | Absolute path to problems directory |
| `QLAB_NB_PORT` | `5001` | Notebook q process port |
| `QLAB_JUDGE_TIMEOUT` | `10` | Seconds before judge kills a q subprocess |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string (Atlas in prod) |
| `MONGODB_DB` | `qlab` | MongoDB database name |
| `CLERK_JWKS_URL` | — | Clerk JWKS endpoint for JWT verification |
| `CLERK_SECRET_KEY` | — | Clerk secret key (used by web frontend) |
| `CLERK_WEBHOOK_SECRET` | — | Svix signing secret for `/webhooks/clerk` |

See `.env.example` for the full template.

## Architecture

```
Web (Next.js :9091)  VS Code extension
        ↓                    ↓
     Clerk auth         FastAPI (8000)
                              ↓
                    ┌─────────┴─────────┐
                 MongoDB          notebook q (5001)
          (problems, submissions,  (persistent state)
               users)
                                        ↓
                               q judge subprocess
                                 (per submission)
```

**Single data store — MongoDB** (motor/`AsyncIOMotorClient`). Three collections:
- `problems` — seeded from `problems/*/problem.json` via `scripts/seed_problems.py`; `solve_count` is live-incremented on correct submissions
- `submissions` — one document per judge run, indexed on `(problem_id, status, timing_ms, char_count)`
- `users` — synced from Clerk via webhook; queried at submit time to resolve the handle

MongoDB is injected via `deps.get_db` → `request.app.state.db`. All route handlers that touch it are `async def`.

**kdb+ is notebook-only.** The kdb+ db process (`db/schema.q`) has been retired — `start.sh` no longer launches it. Only the notebook q process (port 5001) remains. `PYTHONPATH` must include the `api/` dir since imports are flat (`from models import ...`, not `from api.models import ...`). Routers: `problems`, `submissions`, `notebook`, `users`, `webhooks`.

## Auth (Clerk)

FastAPI uses Clerk JWT verification (`api/services/auth.py`). Protected routes depend on `verify_clerk_token` via `Depends`:
- `GET /users/me` — returns or auto-creates the MongoDB user record for the calling Clerk user
- `PATCH /users/me/nickname` — sets display nickname
- `POST /webhooks/clerk` — Svix-verified webhook that upserts user records on `user.created` / `user.updated` events; requires `CLERK_WEBHOOK_SECRET`

Auth is RS256 JWT verified against `CLERK_JWKS_URL`. The JWKS client is a module-level singleton with key caching.

## Web frontend (`web/`)

Next.js 14 app with `@clerk/nextjs`, runs on port 9091. Wraps the whole app in `ClerkProvider`. Pages: sign-in, sign-up, auth callback, profile. Not the primary client (VS Code extension is) — this is the web-facing companion for auth flows and profile management.

```bash
cd web
npm install
npm run dev    # http://localhost:9091
```

Requires `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `web/.env.local`.

## VS Code extension (`vscode-extension/`)

A TypeScript VS Code extension providing a native LeetCode-style experience:

- **Sidebar**: `ProblemsProvider` tree grouped by difficulty (easy/medium/hard)
- **Panel**: `ProblemPanel` WebviewPanel in `ViewColumn.Two` with tabs — Description, Examples, Test, Submit, Community (leaderboard)
- **Solution file**: auto-created at `qlab-solutions/{slug}.q` in `ViewColumn.One` with starter template
- **Submit**: `Ctrl+Shift+S` on any `.q` file; panel reads editor code via `getEditorCode` message
- **Theming**: uses `--vscode-*` CSS variables throughout — no custom styling needed

Build and install:
```bash
cd vscode-extension
npm install
npm run install-ext   # compile → package → code --install-extension
```

`qlab.apiUrl` setting defaults to `http://localhost:8000`.

## Running tests

```bash
pytest                        # run all tests from repo root
pytest tests/test_auth.py     # run a single test file
pytest -k test_valid_token    # run a single test by name
```

`pytest.ini` sets `asyncio_mode = auto` and `pythonpath = . api` — no extra env needed for the auth unit tests. Integration tests that hit kdb+ or MongoDB require the stack to be running.

## Judge pipeline

Every `POST /submissions` triggers this flow in `api/services/judge.py`:

1. Python regex validates `func` has exactly one parameter (fast reject before spawning q)
2. A self-contained q script is written to a temp file — it `\l`-loads `judge/harness.q`, then `problems/{id}/test_gen.q` and `problems/{id}/reference.q` using **absolute paths** (the script runs from `/tmp`, relative paths break)
3. `q <tempfile>` is spawned as a subprocess with a timeout
4. The q script outputs exactly one JSON line to stdout: `{"status":..., "timing_ms":..., "char_count":...}` (or an error variant)
5. Python parses that line and returns `JudgeResult`

**`judge/harness.q`** defines shared helpers loaded into every judge script: `.qlab.out` (JSON stdout), `.qlab.safe` (error-catching wrapper), `.qlab.firstMismatch` (element-wise list comparison), `.qlab.fmt` (value formatter). Edit this file to change harness behavior — don't duplicate these utilities in generated scripts.

**Critical q gotcha:** A bare `/` on its own line in a `.q` file starts a block comment that silently swallows everything after it until `\`. Never embed q code with bare `/` lines — always `\l` load files instead of inlining them.

**Timing:** The judge uses `.z.p` timestamps instead of `\t` because `\t` is a system command that can't be embedded in a script string without escaping issues. `timing:\`long$1e-6*\`long$.z.p-t0` after `do[1000;func each x]` gives milliseconds equivalent to `\t:1000`.

**Correctness comparison:** Uses `expected~'actual` (each-match) not `expected=actual` — the latter does atomic equality which doesn't work for comparing lists of strings.

## Adding a problem

Create `problems/{slug}/`:
- `problem.json` — full problem spec (see `p001_same_same/problem.json` for schema). Must include `"id"` (unique int), `"judge_seed"` (int for `\S`), and `"test_call"` (example call shown to users).
- `test_gen.q` — defines global `x` (the judge input). No bare `/` lines. The seed is set by the harness before this file is loaded.
- `reference.q` — defines `func` — the canonical correct solution. No bare `/` lines.

After adding files, seed into MongoDB:
```bash
python3 scripts/seed_problems.py   # idempotent — safe to re-run
```

The API reads problems from MongoDB, not from disk at request time. `solve_count` is managed by the DB; `scripts/seed_problems.py` uses `$setOnInsert` so re-seeding never resets it.

## Submission rules enforced

- Must start with `func:` and define a function named `func`
- Single parameter only — `func:{[t;h]...}` is rejected; use `func:{[x]...}`
- Output must match reference exactly (string `"YES"`/`"NO"`, not boolean `1b`)
- Ranking: timing_ms ASC, then char_count ASC (`-2+count string func`)
- K submissions must include a Q equivalent

## Async constraint

All route handlers must be `async def`. MongoDB (motor) and the notebook service both require it. There is no pykx in the API — the kdb+ db process has been retired.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- **Before opening any source file to understand the codebase** (including during `/init`, architecture reviews, or bug investigations), read `graphify-out/GRAPH_REPORT.md` first. This is the entry point — it tells you which nodes are most connected and which communities exist, so you know where to look instead of guessing.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
