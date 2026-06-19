---
name: qlab-smoke
description: Use when smoke-testing qlab HTTP endpoints against a running stack — when the user pastes a curl with an Authorization Bearer JWT, says "test this endpoint", "test now", "hit /submissions", "/execute", "/problems", or a Clerk token has expired and needs re-injecting.
---

# qlab-smoke

## Overview
Fire authenticated requests at a running qlab backend without the manual "copy curl → token expired → re-grab from browser → re-run" loop. A single script resolves a fresh bearer token, then runs requests.

## When to use
- User pastes a raw `curl 'http://localhost:8000/...'` with `Authorization: Bearer eyJ...` and wants it run.
- "Test the judge", "hit /submissions", "check /execute", "is /problems up?"
- A previous curl 401'd because the JWT expired.

## How
Token resolution (first hit wins): `$QLAB_JWT` → `./.qlab-jwt` file → `QLAB_JWT=` in `.env`.

```bash
scripts/smoke.sh health                  # GET /health (no auth)
scripts/smoke.sh GET /problems           # authed GET
scripts/smoke.sh GET /submissions/me
scripts/smoke.sh POST /submissions '{"problem_id":1,"code":"func:{x}"}'
scripts/smoke.sh POST /execute '{"code":"1+1"}'
scripts/smoke.sh --suite                 # health + problems + submissions/me battery
```

When the user pastes a curl, extract the **method + path + JSON body** and pass those to `smoke.sh` — drop their stale `Authorization` header; the script injects a fresh token. Print HTTP status + latency + body.

## Common mistakes
- Re-using the pasted (expired) token instead of letting the script resolve a fresh one.
- Forgetting `QLAB_API_URL` for the frontend (`:9091`) vs backend (`:8000`).
- Running before the stack is up — pair with `qlab-stack`.
