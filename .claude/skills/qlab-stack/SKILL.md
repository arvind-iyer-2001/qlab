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
./scripts/dev.sh            # http://localhost:8000  (API_PORT=8080 to override)
```
Wraps `PYTHONPATH=api uv run uvicorn api.main:app --reload --reload-dir api`.
`--reload` restarts on save. Env (`MONGODB_URI`, `QLAB_DOCKER_IMAGE`, `QLAB_LICENSE_B64`, etc.) is auto-loaded from `.env` by `api/main.py` (`load_dotenv`). The judge runs in the kdb-x docker image; ensure `QLAB_DOCKER_IMAGE` is set.

## Frontend (Next.js, port 9091)
```bash
cd web && npm run dev      # http://localhost:9091
```
Needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` in `web/.env.local`.

## Notes
- No combined launcher — `start.sh` is removed. Run backend (`./scripts/dev.sh`) and frontend (`npm run dev`) as separate processes.
- After a backend edit, give `--reload` a moment — `qlab-judge-check --wait-reload` handles this.
- Don't reach for docker-compose for routine local iteration; the user has repeatedly preferred separate processes.
