# qLab

A competitive coding platform for kdb+/q developers. Submit a q function, get judged for correctness, then ranked by speed — think Leetcode but for q.

## How it works

Each problem asks you to write a single-parameter q function named `func`. Your submission is:

1. **Judged for correctness** — output must exactly match the reference solution across all test cases
2. **Timed** — equivalent of `\t:1000 func each x` (1000 iterations, judge seed fixed)
3. **Ranked** — fastest correct solution wins; code length (`-2+count string func`) breaks ties

## Stack

```
VS Code extension → FastAPI (8000) → kdb+ db (5000)
                          ↓
                  q judge subprocess (per submission)
                  q notebook process (5001, persistent)
```

- **kdb+ db** (`db/schema.q`) — in-memory `submissions` table, persisted to disk after every insert
- **kdb+ notebook** — persistent q process for interactive code execution (notebook cells)
- **FastAPI** (Python) — async REST API with pykx for kdb+ IPC

## VS Code extension

A native VS Code extension lives in `vscode-extension/`. It provides:

- Sidebar tree view grouping problems by difficulty
- Per-problem webview panel (Description, Examples, Test, Submit, Community tabs)
- Auto-creates `qlab-solutions/{slug}.q` files with starter template
- `Ctrl+Shift+S` to submit the active `.q` file
- Native VS Code theming via `--vscode-*` CSS variables

```bash
cd vscode-extension
npm install
npm run install-ext    # compile + package + install into VS Code
```

Set the `qlab.apiUrl` setting to point at your running FastAPI instance (default: `http://localhost:8000`).

## Prerequisites

- kdb+/q v4+ (personal or commercial licence)
- Python 3.10+
- Node.js 18+ (for VS Code extension)

## Setup

```bash
# Python dependencies
pip install -r api/requirements.txt
```

## Running

```bash
./start.sh
```

This launches three processes:

| Process | Default port |
|---|---|
| kdb+ db | 5000 |
| kdb+ notebook | 5001 |
| FastAPI | 8000 |

API docs at `http://localhost:8000/docs`.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `QLAB_Q_BINARY` | `q` | Path to q binary |
| `PROBLEMS_DIR` | `/problems` | Absolute path to problems directory |
| `QLAB_DB_HOST` | `localhost` | kdb+ host |
| `QLAB_DB_PORT` | `5000` | kdb+ port |
| `QLAB_NB_PORT` | `5001` | Notebook q process port |
| `QLAB_JUDGE_TIMEOUT` | `10` | Seconds before judge kills q subprocess |

## Adding a problem

Create `problems/{slug}/` with three files:

**`problem.json`** — problem metadata and spec. Required fields:
- `id` — unique integer
- `slug` — directory name
- `judge_seed` — integer passed to `\S` before test generation
- `test_call` — example call shown to users

**`test_gen.q`** — defines global `x` (the judge input). The seed is set by the harness before this file is loaded. No bare `/` lines (a bare `/` starts a block comment in q).

**`reference.q`** — defines the canonical `func`. No bare `/` lines.

See `problems/p001_same_same/` for a complete example.

## Submission rules

- Code must start with `func:` and define a function named `func`
- `func` must take exactly one parameter — `func:{[t;h]...}` is rejected
- Output must match the reference exactly (string `"YES"`/`"NO"`, not boolean `1b`)
- K submissions must include a Q equivalent
