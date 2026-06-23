---
name: qlab-judge-check
description: Use when verifying the qlab judge end-to-end — when the user says "test the reference solution and an incorrect solution", "test out a wrong answer", "did the judge break", after editing judge code, or wants to confirm correct/incorrect submissions are graded right (often "wait for reload then test").
---

# qlab-judge-check

## Overview
Verify the judge grades correctly by submitting the canonical reference solution (expect `ACCEPTED`) AND a deliberately wrong function (expect not accepted), in one command. Replaces the manual "submit good, submit bad, wait 10s after a backend edit, retry" dance.

## When to use
- "Test the reference solution and an incorrect one."
- After editing `api/services/judge.py` or `judge/harness.q`.
- Confirming a problem's `reference.q` / `test_gen.q` actually judge correctly.

## How
```bash
uv run scripts/judge_check.py 1               # problem id 1
uv run scripts/judge_check.py 7 --wait-reload # poll /health first (uvicorn --reload)
```

`--wait-reload` polls `/health` until 200 instead of a fixed `sleep 10` after a backend edit. The script reads `problems/<dir>/reference.q` by matching `problem.json` `id`, submits it, then submits `func:{[x] \`wrong}`. Exits non-zero if either expectation fails.

Token resolution same as `qlab-smoke`: `$QLAB_JWT` → `.qlab-jwt` → `.env`.

## Common mistakes
- Running right after a code edit without `--wait-reload` — you test the old worker.
- Expecting a boolean; the judge returns string `"YES"`/`"NO"` and a `status` field.
- Stack/judge docker (`QLAB_DOCKER_IMAGE`) or license (`QLAB_LICENSE_B64`) not set → reference itself fails; fix the stack first, not the test.
