---
name: qlab-handoff
description: Use when producing a session handoff document for qlab — when the user says "make a handoff", "handoff file please", "document this to hand off to another agent", "comprehensive doc for Opus", or wants to capture current state before ending/continuing work in a fresh session.
---

# qlab-handoff

## Overview
Generate a consistent handoff doc capturing current state so another agent (or a future session) can resume cold. These live in `docs/superpowers/specs/`.

## When to use
- "Just generate a handoff file now."
- "Make a comprehensive document to hand off to Opus."
- Wrapping up a session mid-task.

## Steps
1. Gather state — run these and read the output:
   ```bash
   git status
   git diff origin/main --stat
   git log --oneline -10
   uv run scripts/gaps.py --path docs   # known open items
   ```
2. Write to `docs/superpowers/specs/<YYYY-MM-DD>-<slug>-handoff.md` using the fixed section layout below.
3. Tell the user the path; offer to commit.

## Required section layout
```markdown
# <Title> — Handoff (<date>)

## Context
What we were doing and why (2-4 sentences).

## Changes so far
Per-file: path — what changed — why. Note committed vs uncommitted.

## Current state
Branch, what runs, what's verified working, what's not.

## Open issues / risks
Bullet list — be specific (file:line where known).

## Next steps
Ordered, concrete actions to resume.

## Resume commands
The exact commands to bring the stack up and continue (see qlab-stack).
```

## Common mistakes
- Vague "fix the frontend" next-steps — make them concrete and ordered.
- Omitting uncommitted-vs-committed status — the next agent must know what's on disk only.
- Skipping resume commands — always include how to restart the stack.
