# qLab Resilience Fixes — Handoff

Date: 2026-06-18
Status: ✅ **all 5 implemented and merged** (PR #11, on `main` as of 2026-06-26). This
doc is retained as the design record; the plans below describe what was built.
Workflow used: backend blockers landed together in PR #11 (fail-closed sandbox +
critical fixes), not one PR per issue as originally planned.

## Goal

Fix 5 resilience gaps in qLab. Each is independent — own branch, own PR.

---

## Issue 1 — Orphaned data on user delete

**Problem:** `user.deleted` webhook (and Clerk-side delete) removes only the `users`
doc. Submissions + `hint_reveals` stay, leaving leaderboard handles with no owner.
No cascade.

**Decision: ANONYMIZE, keep data** (not hard delete). Preserve competition
history + leaderboard integrity.

**Key fact:** `handle` is denormalized onto each submission at submit time
(`api/services/submissions.py:21` stores `"handle": handle or "anonymous"`).
Leaderboard reads `handle` off the submission (`$first: "$handle"`), does NOT
join to `users`. So anonymize = rewrite stored handle, no join to fix.

**Plan:**
- In `webhooks.py` `user.deleted` branch (`api/routers/webhooks.py`, currently
  `db.users.delete_one`): instead/also:
  - `db.submissions.update_many({"user_id": clerk_user_id}, {"$set": {"handle": "[deleted]"}})`
  - keep `hint_reveals` (or leave as-is — they're keyed by clerk_user_id, harmless;
    decide: leave them, no PII). Document choice.
  - then delete (or tombstone) the `users` doc.
- Put cascade logic in a service fn (e.g. `services/users.py::delete_user`) so it's
  testable + reusable. Webhook calls it.
- Test: create user + submissions, fire delete, assert submissions.handle=="[deleted]"
  and survive.

---

## Issue 2 — License lifecycle one-way

**Problem:** Can add/replace base64 license, but no remove endpoint, no expiry
handling. q-solver detects expired license + re-prompts; qLab fails run with raw
q error.

**Decision: DELETE endpoint + detect & friendly remap.**

**Plan:**
- Add `DELETE /users/me/license` in `api/routers/users.py` →
  `db.users.update_one({clerk_user_id}, {"$unset": {"license_b64": ""}})`.
  Return `{"has_license": false}`. Existing `GET /users/me/license` already reports status.
- Expiry detection in q runner/judge:
  - License-expired produces a recognizable q error on stderr (e.g. contains
    `lic`/`exp` — VERIFY exact string by triggering an expired license, or check
    q-solver's detection logic for the pattern it matches).
  - In `api/services/runner.py` (`run_code` error path) and judge, map that
    stderr pattern to a clear message: "kdb+ license expired — re-upload via
    profile" instead of raw error.
  - For judge: add a `SubmissionStatus` or reuse `error` with friendly message.
- Web help text already links kdb-x license source (commit 576cab5) — may want a
  "remove license" button in `web/app/profile/page.tsx` (optional, note it).
- Tests: unit-test the stderr→friendly-message mapper.

---

## Issue 3 — QLAB_LICENSE_B64 startup check

**Problem:** `QLAB_LICENSE_B64` mandatory in deploy env or host fallback silently
empty (per-user still works). No startup warning if missing/invalid.

**Decision: WARN (not fatal)** — per-user license still works, so don't `sys.exit`.

**Plan:**
- In `api/main.py` `lifespan` (after Mongo connect): read `QLAB_LICENSE_B64`.
  - If empty: `logger.warning("QLAB_LICENSE_B64 not set — host fallback license empty; only per-user licenses will work")`.
  - If set but invalid base64 (`base64.b64decode(..., validate=True)` raises):
    `logger.warning("QLAB_LICENSE_B64 is set but not valid base64 — host fallback will fail")`.
- Reuse the same base64 validation already in `users.py` (pasted-key whitespace
  strip + `b64decode(validate=True)`). Consider extracting to a small helper
  (e.g. `services/license.py::validate_b64`) shared by users router + startup.
- Test: hard to unit-test logging cleanly; at minimum test the validate helper.

---

## Issue 4 — /execute multi-statement eval

**Problem:** `/execute` body eval is single-statement-ish. Multi top-level
statements in Test tab (helper def + func) can fail — same limitation as judge.
Fine for starter template, not general.

**Current behavior** (`api/services/runner.py::_build_run_script`):
- Splits lines: `body = lines[:-1]`, `last = lines[-1]`.
- Body joined with `\n`, eval'd via `@[value;"...";...]` (one `value` call on the
  whole joined body).
- Last line eval'd + formatted via `.Q.s1 value x`.
- Multi top-level statements break because `value` on a multi-statement string
  doesn't run them as sequential statements the way a loaded script would.

**Plan (needs a q approach decision):**
- Option A: split body into top-level statements and `value` each in sequence
  (must handle multi-line `{}` blocks where newlines are intra-statement — can't
  naive split on `\n`). Statement boundary = newline at brace-depth 0.
- Option B: write body to a temp `.q` and `\l` load it (script column rules:
  closing `}` at column 0 starts new statement — the very bug commit 494a0ef
  worked around). Risky.
- **Recommend A:** brace-depth-aware line grouping, then `value` each group.
  Keep last expression handling as-is.
- Beware q gotcha (CLAUDE.md): bare `/` lines = block comment; `_strip_bare_slash`
  already handles. Keep using it.
- Tests: helper-def + func across 2+ statements returns correct output.
- NOTE: judge has the same limitation but is out of scope here unless trivially
  shared — `/execute` only.

---

## Issue 5 — No HTTP smoke-test in CI

**Problem:** No `.github/workflows/` exists. HTTP verified manually with a minted
token, nothing automated guards it.

**Decision: in-process FastAPI TestClient.** Override auth dependency, mock/mongomock
DB. Hit `/health` + key routes. No real Clerk token, no docker.

**Plan:**
- Add `tests/test_smoke_http.py`: `TestClient(app)`, override `verify_clerk_token`
  via `app.dependency_overrides`, inject a fake DB into `app.state.db`
  (mongomock async or a stub — check what existing tests in `tests/test_auth.py`,
  `test_solutions.py`, `test_submissions_me.py` already use for DB).
  - Assert `GET /health` → 200 `{"status":"ok"}`.
  - Assert auth-protected routes 401 without token, 200 with override.
- Add `.github/workflows/ci.yml`: on push/PR, `pip install` deps, run `pytest`.
  `pytest.ini` already sets `pythonpath = . api`, `asyncio_mode = auto`.
- Existing test deps: motor, svix, pyjwt, fastapi, etc. — pin from existing
  requirements file (find it: `requirements.txt` / `pyproject.toml`).

---

## Repo facts (verified this session)

- API imports are FLAT (`from models import`, `from services...`) — `PYTHONPATH`
  must include `api/`. `pytest.ini` handles it (`pythonpath = . api`).
- Routers registered in `api/main.py`: problems, submissions, execute, users,
  webhooks, solutions, stats.
- All route handlers `async def` (motor + notebook require it).
- License flow: per-user `license_b64` on users doc wins; else
  `QLAB_LICENSE_B64` host env; passed to container as `KDBLIC` env, decoded
  in-container to `/root/.kx/kc.lic` (`api/services/judge.py:_DECODE_LIC`).
- `users.py` already strips whitespace + validates base64 on license upload.
- Base64 validation pattern: `base64.b64decode("".join(s.split()), validate=True)`.
- Tests dir: `tests/{test_auth,test_solutions,test_submissions_me}.py` + `__init__.py`.
- graphify graph at `graphify-out/`; run `graphify update .` after code changes.

## Suggested order

3 (startup check, trivial) → 1 (cascade) → 2 (license) → 4 (execute, hardest q) → 5 (CI).
Or any order — all independent. Each: branch off `main`, implement, test, PR.
