---
name: qlab-stack
description: Use when starting or running the qlab stack — when the user asks "how do I start the app", "run backend in watch mode", "start backend and frontend separately", needs the uvicorn command, or is bringing up FastAPI / Next.js for local dev or a demo.
---

# qlab-stack

## Overview
Bring up the qlab stack for local dev/demo. Two preferences are fixed from past sessions: **use `uv`** to run Python, and start **backend and frontend separately** (not via docker-compose) when iterating.

## When to use
- "How do I start the app myself?" / "run the backend in watch mode".
- Bringing up the stack before `qlab-smoke` or `qlab-judge-check`.

## Backend (FastAPI, watch mode)
```bash
PYTHONPATH=api uv run --with-requirements api/requirements.txt \
  python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
`--reload` watches `api/` and restarts on save. Env (`MONGODB_URI`, `QLAB_DOCKER_IMAGE`, `QLAB_LICENSE_B64`, etc.) loads from `.env`. The judge runs in the kdb-x docker image; ensure `QLAB_DOCKER_IMAGE` is set.

## Frontend (Next.js, port 9091)
```bash
cd web && npm run dev      # http://localhost:9091
```
Needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` in `web/.env.local`.

## Notes
- `./start.sh` launches notebook q + FastAPI together; prefer separate processes when debugging one side.
- After a backend edit, give `--reload` a moment — `qlab-judge-check --wait-reload` handles this.
- Don't reach for docker-compose for routine local iteration; the user has repeatedly preferred separate processes.
