---
name: qlab-fresh
description: Use when resetting qlab to a clean state for a demo — when the user says "start fresh", "clean up all submissions", "set solve counts to 0", "delete all users", "delete Clerk users", "wipe the data", or wants a clean slate before showing the product.
---

# qlab-fresh

## Overview
Reset qlab to a clean demo state in one destructive, ordered operation. Codifies the exact sequence the user repeats before demos.

## When to use
- "Delete all submissions and set solve counts to 0."
- "Delete users from Mongo then Clerk, let's start fresh."
- Pre-demo clean slate.

## Order (fixed — matters)
1. Mongo: delete all `submissions`
2. Mongo: delete all `hint_reveals`
3. Mongo: set every `problems.solve_count = 0`
4. Mongo: delete all `users`
5. Clerk: delete all Clerk users via the `clerk` CLI (unless `--skip-clerk`)

Mongo before Clerk so the webhook can't recreate a half-deleted user mid-wipe.

## How
```bash
uv run --with motor --with python-dotenv scripts/fresh_start.py --dry-run   # preview counts
uv run --with motor --with python-dotenv scripts/fresh_start.py             # interactive confirm
uv run --with motor --with python-dotenv scripts/fresh_start.py --yes       # no prompt
uv run --with motor --with python-dotenv scripts/fresh_start.py --skip-clerk
```

## Safety — this is destructive
- ALWAYS run `--dry-run` first and show the user the counts before wiping.
- Only pass `--yes` when the user has explicitly confirmed this run.
- Targets whatever `MONGODB_URI`/`MONGODB_DB` resolve to — **confirm it is not prod Atlas** before running.
- Clerk deletion is irreversible; `--skip-clerk` if unsure.
