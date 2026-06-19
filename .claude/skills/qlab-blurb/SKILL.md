---
name: qlab-blurb
description: Use when writing a short stakeholder summary of a project (qlab, q-solver, knowledgibility-ai) — when the user asks for "a N-line summary of what X is and what it solves", a blurb for a manager or KX seniors, or to show progress to leadership. Triggers on "shorter", "no em dash", "N lines" refinements.
---

# qlab-blurb

## Overview
Produce a tight, prose elevator pitch for a project, aimed at the user's manager and senior KX folks. Bakes in the style rules the user always converges on so it's right the first time.

## When to use
- "Give me a 10-line summary of what qlab is and what it solves — for my manager and KX seniors."
- "Same for q-solver / knowledgibility-ai." / "Shorter." / "5 lines."

## Locked style rules
- **Prose, not bullet points** ("10 lines, not 10 points").
- **No em dashes** (`—`). Use commas, periods, or "and".
- **Exactly the requested line count** (default 10; honor "shorter"/"5 lines").
- Audience = manager + senior KX leadership: lead with what it is and the problem it solves, then traction/progress. Plain business language, minimal jargon.
- No marketing fluff, no hype adjectives.

## Steps
1. Read the project's `README.md` (and `CLAUDE.md`) for facts — don't invent capabilities.
2. Draft at the requested line count following the locked rules.
3. On "shorter" / "N lines", re-cut to that count; on "no em dash", scan output for `—` and replace.

## Common mistakes
- Slipping in em dashes (the user always flags these) — grep your own draft for `—` before sending.
- Returning bullets when prose was asked for.
- Overstating progress — keep claims to what the README/code supports.
