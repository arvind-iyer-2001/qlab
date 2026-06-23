---
name: qlab-ship
description: Use when committing or shipping qlab changes — when the user says "list all changes and commit one by one", "order the changes logically then commit", "commit and push", "reset staging to main, retarget PRs, merge", "raise PR from staging to main", or "wait for CI to pass then merge".
---

# qlab-ship

## Overview
Two recurring git/PR rituals on qlab: (A) turn a messy working tree into ordered, logical commits; (B) drive the staging→main PR flow, gating merges on green CI.

## When to use
- "Describe all the changes, order them logically, commit one by one."
- "Reset staging to main, change PR targets to staging, merge, raise PR to main."
- "Wait for the tests to pass, then merge."

## A) Commit plan
1. `git status` + `git diff` → group changes by concern (one logical change per commit).
2. Present the ordered list to the user; get approval.
3. Commit each group in order with focused messages. Stage selectively (`git add -p` / explicit paths), not `git add -A`.
4. Commit message footer (per repo convention):
   ```
   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```
5. Push only when asked; if on `main`, branch first.

## B) Staging → main PR flow
```bash
gh pr list                                   # current PRs + targets
git switch staging && git reset --hard origin/main   # reset staging (CONFIRM first — discards staging history)
gh pr edit <n> --base staging                # retarget PRs to staging
gh run watch <run-id>                        # wait for CI green before merge
gh pr merge <n> --squash                     # merge when green
gh pr create --base main --head staging --title ... --body ...   # PR staging→main
```
PR body footer:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Safety
- `git reset --hard` and force operations are destructive — confirm the branch and that origin is the intended source first.
- Never merge before CI is green; use `gh run watch`, don't assume.
- Branch naming: the user renames branches (e.g. `feat/fix-q-judge-process`) — confirm the name.
