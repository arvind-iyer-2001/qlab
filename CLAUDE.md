# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

qLab — a competitive coding platform for kdb+/q developers. Users submit a q function named `func` that is auto-judged for correctness then speed. Think Leetcode but for q, with timing (`\t:1000`) and code length (`-2+count string func`) as the scoring metrics.

## Starting the stack

```bash
cd ~/qlab
./start.sh          # launches kdb+ db (5000) + notebook q (5001) + FastAPI (8000)
```

Individual processes:
```bash
# kdb+ db
/home/aiyer/.kx/bin/q db/schema.q -p 5000

# Notebook q process (persistent, stateful)
/home/aiyer/.kx/bin/q -p 5001 -q

# FastAPI
PROBLEMS_DIR=/home/aiyer/qlab/problems \
QLAB_Q_BINARY=/home/aiyer/.kx/bin/q \
QLAB_DB_HOST=localhost QLAB_DB_PORT=5000 \
QLAB_NB_PORT=5001 \
PYTHONPATH=/home/aiyer/qlab/api \
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs at `http://localhost:8000/docs`.

## Key env vars

| Var | Default | Purpose |
|---|---|---|
| `QLAB_Q_BINARY` | `q` | Path to q binary — on this machine: `/home/aiyer/.kx/bin/q` |
| `PROBLEMS_DIR` | `/problems` | Absolute path to problems directory |
| `QLAB_DB_HOST/PORT` | `localhost:5000` | kdb+ db process address |
| `QLAB_NB_PORT` | `5001` | Notebook q process port |
| `QLAB_JUDGE_TIMEOUT` | `10` | Seconds before judge kills a q subprocess |

## Architecture

```
VS Code extension → FastAPI (8000) → kdb+ db (5000)
                          ↓                ↓
                  q judge subprocess   notebook q (5001)
                    (per submission)   (persistent state)
```

**Three separate processes must all be running:**

1. **kdb+ db** (`db/schema.q`) — in-memory `submissions` table, persisted to `db/data/submissions` after every insert. IPC API: `.db.insertSubmission`, `.db.leaderboard`, `.db.solveCount`. Python connects via `pykx.AsyncQConnection` — all db-touching route handlers must be `async def`.

2. **kdb+ notebook** — plain q process on port 5001, no script. Keeps global state between cells; `value "code"` evaluates in its global scope. Reset by killing and restarting the process (`api/services/notebook.py`).

3. **FastAPI** (`api/`) — all route handlers are `async def` (required by pykx). `PYTHONPATH` must include the `api/` dir since imports are flat (`from models import ...`, not `from api.models import ...`). Problem metadata is read from `problems/{slug}/problem.json` — no db involved for problem content. Routers: `problems`, `submissions`, `notebook`.

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

## Judge pipeline

Every `POST /submissions` triggers this flow in `api/services/judge.py`:

1. Python regex validates `func` has exactly one parameter (fast reject before spawning q)
2. A self-contained q script is written to a temp file — it `\l`-loads `problems/{id}/test_gen.q` and `problems/{id}/reference.q` using **absolute paths** (the script runs from `/tmp`, relative paths break)
3. `q <tempfile>` is spawned as a subprocess with a timeout
4. The q script outputs exactly one JSON line to stdout: `{"status":..., "timing_ms":..., "char_count":...}` (or an error variant)
5. Python parses that line and returns `JudgeResult`

**Critical q gotcha:** A bare `/` on its own line in a `.q` file starts a block comment that silently swallows everything after it until `\`. Never embed q code with bare `/` lines — always `\l` load files instead of inlining them.

**Timing:** The judge uses `.z.p` timestamps instead of `\t` because `\t` is a system command that can't be embedded in a script string without escaping issues. `timing:\`long$1e-6*\`long$.z.p-t0` after `do[1000;func each x]` gives milliseconds equivalent to `\t:1000`.

**Correctness comparison:** Uses `expected~'actual` (each-match) not `expected=actual` — the latter does atomic equality which doesn't work for comparing lists of strings.

## Adding a problem

Create `problems/{slug}/`:
- `problem.json` — full problem spec (see `p001_same_same/problem.json` for schema). Must include `"id"` (unique int), `"judge_seed"` (int for `\S`), and `"test_call"` (example call shown to users).
- `test_gen.q` — defines global `x` (the judge input). No bare `/` lines. The seed is set by the harness before this file is loaded.
- `reference.q` — defines `func` — the canonical correct solution. No bare `/` lines.

The `test_gen.q` for p001 mirrors the exact test data the problem creator used: `a:"23456789TJQKA"; b:?:[?[100;a],'100?"DCHS"]; c:-1_5 cut b; x:(enlist each c 0),'enlist each c -5#til #:[c];`

## Submission rules enforced

- Must start with `func:` and define a function named `func`
- Single parameter only — `func:{[t;h]...}` is rejected; use `func:{[x]...}`
- Output must match reference exactly (string `"YES"`/`"NO"`, not boolean `1b`)
- Ranking: timing_ms ASC, then char_count ASC (`-2+count string func`)
- K submissions must include a Q equivalent

## pykx threading constraint

`pykx.SyncQConnection` cannot open sockets off the main thread — FastAPI's threadpool triggers this. All functions in `api/services/db.py` are `async` and use `AsyncQConnection`. Any new route handlers that call `db.*` must be `async def`.
