---
name: qlab-gaps
description: Use when auditing what's left to do on qlab — when the user asks "what gaps are there", "what tasks are left", "next steps remaining", "what from our future plans haven't we done", or wants unfinished work surfaced across README / FUTURE / spec markdown.
---

# qlab-gaps

## Overview
Surface stated-but-unfinished work across all markdown docs, then cross-check against code. Entry point for "what's left?" / "gaps vs our future plans?".

## When to use
- "What gaps are there vs what we planned?"
- "What tasks are left now?" / "next steps remaining?"
- "Not just FUTURE.md — check all the MD files."

## How
```bash
uv run scripts/gaps.py              # all tracked *.md (excludes graphify-out, node_modules)
uv run scripts/gaps.py --path docs  # scope to a dir
```
Flags markers: `TODO`, `FIXME`, `not yet`, `planned`, `future work`, `pending`, `WIP`, `coming soon`, unticked `- [ ]` checkboxes. Output is `file:line | marker | text`.

Then **verify against code** — a marker saying "planned" may already be done. For each candidate gap, grep the codebase (or use `graphify query`) to confirm it's genuinely missing before reporting. Present as: `Planned | Status (done/missing/partial) | Evidence (file:line)`.

## Common mistakes
- Reporting raw markers as gaps without checking the code — spec checkboxes are often already implemented.
- Forgetting design specs in `docs/superpowers/specs/` carry many checkboxes by design; scope with `--path` if noisy.
