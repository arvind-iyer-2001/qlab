# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

qLab — a competitive coding platform for kdb+/q developers. Users submit a q function named `func` that is auto-judged for correctness then speed. Think Leetcode but for q, with timing (`\t:1000`) and code length (`-2+count string func`) as the scoring metrics.

## Starting the stack

```bash
cd ~/qlab
docker build -t qlab-judge judge/   # build the judge image once
./start.sh                          # launches FastAPI (8000) + web (9091)
```

FastAPI on its own (`load_dotenv` reads `.env`):
```bash
PYTHONPATH=api python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Seed problems into MongoDB on first run (idempotent, safe to re-run):
```bash
python3 scripts/seed_problems.py
```

API docs at `http://localhost:8000/docs`.

## Key env vars

| Var | Default | Purpose |
|---|---|---|
| `QLAB_DOCKER_IMAGE` | `qlab-judge` | Image the judge/runner spawn per request (`docker run --rm`) |
| `QLAB_LICENSE_B64` | — | Default/host kdb+ license as a base64 `kc.lic` key (no file on disk) |
| `QLAB_Q_BINARY` | `q` | Local q binary — only used as a fallback when `QLAB_DOCKER_IMAGE` is unset |
| `QLAB_JUDGE_TIMEOUT` | `10` | Seconds before the judge/runner kills the container |
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
                    ┌─────────┴──────────┐
                 MongoDB            qlab-judge container
          (problems, submissions,   (docker run --rm,
           users, license_b64)       per submission / Test run)
```

**Single data store — MongoDB** (motor/`AsyncIOMotorClient`). Three collections:
- `problems` — seeded from `problems/*/problem.json` via `scripts/seed_problems.py`; also stores `test_gen_code` + `reference_solution`. `solve_count` is live-incremented on correct submissions
- `submissions` — one document per judge run, indexed on `(problem_id, status, timing_ms, char_count)`
- `users` — synced from Clerk via webhook (and self-healed from the JWT on `/users/me`); stores `nickname` and the user's base64 `license_b64`

MongoDB is injected via `deps.get_db` → `request.app.state.db`. All route handlers that touch it are `async def`.

**The judge runs in Docker, not a local process.** The kdb+ db process and the persistent notebook process have both been retired — there is no long-lived q process and no pykx. Each submission/Test run spawns a throwaway `qlab-judge` container. `PYTHONPATH` must include the `api/` dir since imports are flat (`from models import ...`, not `from api.models import ...`). Routers: `problems`, `submissions`, `execute`, `users`, `webhooks`, `solutions`, `stats`.

## kdb+ license

The judge needs a KX license, handled as a **base64 key** — never a file on the judge host:
- **Default/host** — `QLAB_LICENSE_B64` (generate with `base64 -i kc.lic`). Used when a user has no license of their own.
- **Per-user** — pasted in the web UI, stored at `users.license_b64`, used for that user's runs.

`api/services/judge.py` resolves the base64 key (per-user → `QLAB_LICENSE_B64`), passes it to the container via the `KDBLIC` env var, and the container decodes it to `/root/.kx/kc.lic`. `_resolve_license_b64`, `_docker_q_cmd`, and `_subprocess_env` are shared helpers reused by the runner.

## Auth (Clerk)

FastAPI uses Clerk JWT verification (`api/services/auth.py`). Protected routes depend on `verify_clerk_token` via `Depends`:
- `GET /users/me` — returns the MongoDB user, auto-provisioning a minimal doc from the JWT claims if missing (`users_svc.get_or_create`)
- `PATCH /users/me/nickname` — sets the nickname and, optionally, the base64 license in one call
- `GET /users/me/license` — reports whether a license is on file (never returns the bytes)
- `POST /webhooks/clerk` — Svix-verified webhook that upserts on `user.created`/`user.updated` and deletes the user doc on `user.deleted`; requires `CLERK_WEBHOOK_SECRET`

Auth is RS256 JWT verified against `CLERK_JWKS_URL`. The JWKS client is a module-level singleton with key caching.

## Web frontend (`web/`)

Next.js 14 app with `@clerk/nextjs`, runs on port 9091. Wraps the whole app in `ClerkProvider`. Pages: landing, sign-in, sign-up, auth callback, profile (with license + nickname), and the split-view problem page. The base64 license key is entered as text (no file upload) on the setup form and profile card.

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

`pytest.ini` sets `asyncio_mode = auto` and `pythonpath = . api` — no extra env needed for the auth unit tests. Integration tests that hit the judge (Docker) or MongoDB require the stack to be running.

## Judge pipeline

Every `POST /submissions` triggers this flow in `api/services/judge.py`:

1. Python regex validates `func` has exactly one parameter (fast reject before spawning q)
2. A self-contained q script is built, **inlining** `test_gen_code` and `reference_solution` from the MongoDB problem doc (bare `/` lines are stripped first). No `\l` file loading — the judge no longer reads `problems/` from disk at request time
3. The script is piped via stdin into `docker run --rm -i qlab-judge`, which decodes the `KDBLIC` base64 license to `kc.lic`, writes the script, and runs `q` on it (with a timeout)
4. The q script outputs exactly one JSON line to stdout: `{"status":..., "timing_ms":..., "char_count":...}` (or an error variant)
5. Python parses that line and returns `JudgeResult`

**`POST /execute`** (the Test tab) uses `api/services/runner.py`, a stateless variant: it loads the user's code in a throwaway container, evaluates the final expression, and returns its formatted value or the q error. The body is run through `value` so a multiline func with a column-0 closing brace (the editor's starter template) still parses.

**Critical q gotchas:**
- A bare `/` on its own line in a `.q` file starts a block comment that silently swallows everything after it until `\`. `_strip_bare_slash` removes these before inlining.
- The judge uses `.z.p` timestamps instead of `\t` because `\t` is a system command that can't be embedded in a script string. `timing:`long$1e-6*`long$.z.p-t0` after `do[1000;func each x]` equals `\t:1000`.
- Correctness uses `expected~'actual` (each-match), not `expected=actual` — the latter does atomic equality and fails on lists of strings.
- `q -` is REPL mode and breaks multi-line scripts, so the container reads the script from a file (`cat > /tmp/j.q && q /tmp/j.q`), never `q -`.

## Adding a problem

Create `problems/{slug}/`:
- `problem.json` — full problem spec (see `p001_same_same/problem.json` for schema). Must include `"id"` (unique int), `"judge_seed"` (int for `\S`), and `"test_call"` (example call shown to users).
- `test_gen.q` — defines global `x` (the judge input). No bare `/` lines. The seed is set before this code runs.
- `reference.q` — defines `func`, the canonical correct solution. No bare `/` lines.

After adding files, seed into MongoDB:
```bash
python3 scripts/seed_problems.py   # idempotent — safe to re-run
```

`seed_problems.py` stores `test_gen.q`/`reference.q` as `test_gen_code`/`reference_solution` on the problem doc, which the judge inlines. The API reads problems from MongoDB, not disk, at request time. `solve_count` is managed by the DB; the seeder uses `$setOnInsert` so re-seeding never resets it.

## Submission rules enforced

- Must start with `func:` and define a function named `func`
- Single parameter only — `func:{[t;h]...}` is rejected; use `func:{[x]...}`
- Output must match reference exactly (string `"YES"`/`"NO"`, not boolean `1b`)
- Ranking: timing_ms ASC, then char_count ASC (`-2+count string func`)
- K submissions must include a Q equivalent

## Async constraint

All route handlers must be `async def` — MongoDB (motor) requires it. There is no pykx in the API; the kdb+ db process and notebook process have both been retired, and the judge runs in Docker.

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- **Before opening any source file to understand the codebase** (including during `/init`, architecture reviews, or bug investigations), read `graphify-out/GRAPH_REPORT.md` first. This is the entry point — it identifies core abstractions (God Nodes) like `QLabApi` and `ProblemPanel`, and maps system communities.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- For cross-module questions, prefer `graphify query "<question>"` or `graphify explain "<concept>"` over grep — these leverage the graph's extracted and inferred edges.
- After modifying code files, run `graphify update .` to keep the graph current (AST-only).
