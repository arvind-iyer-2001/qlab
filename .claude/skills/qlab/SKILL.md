---
name: qlab
description: Use as the entry router for qlab project work — when a request touches the qlab platform (judge, submissions, stack, demo data, handoff, shipping, gaps, stakeholder summary) and it isn't obvious which specific qlab-* skill applies, or when a task chains several of them.
---

# qlab (orchestrator)

## Overview
Router for the project-specific `qlab-*` skills. Map the request to the right skill (or chain), then invoke that skill. Don't re-implement their logic here.

## Skill map
| If the request is about… | Use |
|---|---|
| Hit/test an HTTP endpoint, pasted curl + JWT | `qlab-smoke` |
| Verify the judge with good + bad solution | `qlab-judge-check` |
| Start backend/frontend, watch mode, "how do I run" | `qlab-stack` |
| Reset/wipe data, "start fresh", clear submissions/users | `qlab-fresh` |
| Write a handoff doc | `qlab-handoff` |
| Commit one-by-one, staging→main PR flow, merge on green | `qlab-ship` |
| "What's left", gaps vs plans, next steps | `qlab-gaps` |
| Short stakeholder summary / blurb for manager/KX | `qlab-blurb` |

## Common chains
- **Demo prep:** `qlab-fresh` (clean data) → `qlab-stack` (bring up) → `qlab-smoke` / `qlab-judge-check` (verify) .
- **Judge change:** edit → `qlab-stack` (watch) → `qlab-judge-check --wait-reload` → `qlab-ship`.
- **End of session:** `qlab-gaps` → `qlab-handoff` → `qlab-ship`.
- **Ship work:** `qlab-ship` (commit plan) → CI green → PR staging→main.

## Standing preferences (apply across all qlab-* skills)
- Run Python with **`uv`**, not bare pip/python (see memory `qlab-python-env-uv`).
- Use the **Clerk CLI** for user operations (list/delete users).
- Prefer **separate backend/frontend processes** over docker-compose for local iteration.
- Treat data resets and `git reset --hard` as **destructive — confirm target first**.
- Before reading raw source to answer architecture questions, consult `graphify-out/GRAPH_REPORT.md` / `graphify query`.
