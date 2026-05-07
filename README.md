# qLab

A competitive coding platform for kdb+/q developers. Submit a q function, get judged for correctness, then ranked by speed — think Leetcode but for q.

## How it works

Each problem asks you to write a single-parameter q function named \`func\`. Your submission is:

1. **Judged for correctness** — output must exactly match the reference solution across all test cases
2. **Timed** — equivalent of \`\\t:1000 func each x\` (1000 iterations, judge seed fixed)
3. **Ranked** — fastest correct solution wins; code length (\`-2+count string func\`) breaks ties

## Stack

```bash
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

- **MongoDB** — primary data store for problems, submissions, and users.
- **FastAPI** (Python) — async REST API managing the judge pipeline and kdb+ notebook interaction.
- **kdb+ notebook** — persistent q process (port 5001) for interactive code execution.
- **Web Frontend** (Next.js) — web-facing companion for auth flows and profile management.
- **VS Code Extension** — the primary client for solving problems with native LeetCode-style experience.
- **Graphify** — AST-based knowledge graph for codebase navigation and architectural insights.

## VS Code extension

A native VS Code extension lives in \`vscode-extension/\`. It provides:

- Sidebar tree view grouping problems by difficulty
- Per-problem webview panel (Description, Examples, Test, Submit, Community tabs)
- Auto-creates \`qlab-solutions/{slug}.q\` files with starter template
- \`Ctrl+Shift+S\` to submit the active \`.q\` file
- Native VS Code theming via \`--vscode-*\` CSS variables

```bash
cd vscode-extension
npm install
npm run install-ext    # compile + package + install into VS Code
```

Set the \`qlab.apiUrl\` setting to point at your running FastAPI instance (default: \`http://localhost:8000\`).

## Prerequisites

- kdb+/q v4+ (personal or commercial licence)
- Python 3.10+
- Node.js 18+
- MongoDB

## Setup

```bash
# Python dependencies
pip install -r api/requirements.txt

# Seed problems into MongoDB
python3 scripts/seed_problems.py
```

## Running

```bash
./start.sh
```

This launches the core stack:

| Process | Default port |
|---|---|
| kdb+ notebook | 5001 |
| FastAPI | 8000 |
| Web Frontend | 9091 |

API docs at \`http://localhost:8000/docs\`.

### Environment variables

See \`.env.example\` for the full list of required variables, including Clerk and MongoDB configurations.

## Graphify

This project uses [Graphify](https://github.com/google/gemini-cli) to maintain a knowledge graph of the codebase.

- **Entry Point:** \`graphify-out/GRAPH_REPORT.md\`
- **Update Graph:** \`graphify update .\` (run after significant changes)
- **Query Graph:** \`graphify query "How does the judge pipeline work?"\`

## Adding a problem

Create \`problems/{slug}/\` with three files:

**\`problem.json\`** — problem metadata and spec. Required fields:
- \`id\` — unique integer
- \`slug\` — directory name
- \`judge_seed\` — integer passed to \`\\S\` before test generation
- \`test_call\` — example call shown to users

**\`test_gen.q\`** — defines global \`x\` (the judge input). The seed is set by the harness before this file is loaded.

**\`reference.q\`** — defines the canonical \`func\`.

After adding a problem, run \`python3 scripts/seed_problems.py\` to sync with MongoDB.

## Submission rules

- Code must start with \`func:\` and define a function named \`func\`
- \`func\` must take exactly one parameter — \`func:{[t;h]...}\` is rejected
- Output must match the reference exactly (string \`"YES"\`/\`"NO"\`, not boolean \`1b\`)
- K submissions must include a Q equivalent
