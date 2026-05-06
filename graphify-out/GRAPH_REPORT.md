# Graph Report - qlab  (2026-05-07)

## Corpus Check
- 81 files · ~72,048 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 466 nodes · 698 edges · 31 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 131 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `QLabApi` - 16 edges
2. `ProblemPanel` - 15 edges
3. `Web My Submissions Tab Design Spec` - 13 edges
4. `SubmissionStatus` - 11 edges
5. `JudgeResult` - 11 edges
6. `submit()` - 10 edges
7. `Web My Submissions Tab Implementation Plan` - 10 edges
8. `User Registration, Nickname and My Submissions Design Spec` - 10 edges
9. `get_for_user()` - 9 edges
10. `compute_solutions()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Clerk Auth` --conceptually_related_to--> `activate`  [INFERRED]
  CLAUDE.md → vscode-extension/src/extension.ts
- `Clerk Auth` --references--> `uriHandler`  [EXTRACTED]
  CLAUDE.md → vscode-extension/src/extension.ts
- `Clerk Auth` --references--> `SignOut`  [EXTRACTED]
  CLAUDE.md → web/app/sign-out/page.tsx
- `Web My Submissions Tab (FUTURE)` --semantically_similar_to--> `Web My Submissions Tab Design Spec`  [INFERRED] [semantically similar]
  FUTURE.md → docs/superpowers/specs/2026-05-06-web-submissions-tab-design.md
- `verify_clerk_token()` --calls--> `test_invalid_token_raises_401()`  [INFERRED]
  api/services/auth.py → tests/test_auth.py

## Hyperedges (group relationships)
- **My Submissions Tab end-to-end stack** —  [EXTRACTED 1.00]
- **Click-to-load with dirty-check confirm** —  [EXTRACTED 1.00]
- **Plan-Spec-Roadmap alignment for web My Submissions** —  [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (6): ProfileSetupInner(), QLabApi, buildHtml(), esc(), nonce(), ProblemPanel

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (40): esbuild.js build script, Option A: Split Files (Quick Win), Option B: esbuild + TypeScript Webview, Option C: React Webview (Full GitLens-style), ProblemPanel.ts god file (1131 lines), Template Literal Backtick Escaping Bug, VS Code Extension Structural Improvements, src/webview/panel.css (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (36): code_must_be_single_param(), code_must_define_func(), CommunitySolution, Difficulty, EditorialTier, Example, HintRevealResponse, JudgeResult (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): MySubmissionEntry, get_my_submissions(), submit(), main(), get_all(), get_by_id(), increment_solve_count(), upsert_from_json() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (30): Auth & Users Roadmap, Backend / API Roadmap, Clerk Authentication, Content & Problems Roadmap, Infrastructure & Quality, MongoDB Migration (Phase 2), Web My Submissions Tab (FUTURE), Web/Extension Parity Table (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (19): compute_solutions(), increment_hint_reveals(), _is_unlocked(), make_mock_db_for_router(), make_problem(), make_rsa_key_pair(), make_signing_key_mock(), make_token() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (12): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.3
Nodes (10): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_get_me_without_token_returns_401(), test_invalid_token_raises_401() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (6): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), set_nickname(), upsert()

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.31
Nodes (6): get_leaderboard(), get_problem(), list_problems(), get_solutions(), reveal_hint(), get_by_slug()

### Community 14 - "Community 14"
Cohesion: 0.53
Nodes (4): activate(), deactivate(), jwtIsExpired(), setSignedInContext()

### Community 15 - "Community 15"
Cohesion: 0.6
Nodes (2): health(), lifespan()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (1): handleCallback()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): handleLoadCode(), starterCode()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): addAnimation(), getDirection(), getSpeed()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (4): CommunitySolution Pydantic model, EditorialTier Pydantic model, ReferenceTier Pydantic model, SolutionsResponse Pydantic model

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): fetchQlabUser()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): useMySubmissions()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (1): formatDate()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (1): apiFetch()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): Judge Pipeline, Submission Rules

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): SolutionsConfig Pydantic model, TierConfig Pydantic model

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): health

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): qLab README

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): HintRevealResponse Pydantic model

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): tests/test_solutions.py

## Knowledge Gaps
- **44 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `graphify Knowledge Graph` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (5 nodes): `health()`, `lifespan()`, `main.py`, `main.py`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `AuthCallback()`, `handleCallback()`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `handleLoadCode()`, `starterCode()`, `ProblemLayout.tsx`, `ProblemLayout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `page.tsx`, `fetchQlabUser()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `useMySubmissions.ts`, `useMySubmissions()`, `useMySubmissions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `MySubmissionsTab.tsx`, `formatDate()`, `MySubmissionsTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `api.ts`, `apiFetch()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `Judge Pipeline`, `Submission Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `SolutionsConfig Pydantic model`, `TierConfig Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `HintRevealResponse Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `tests/test_solutions.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_run_q_process()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `submit()` connect `Community 3` to `Community 0`, `Community 10`, `Community 2`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._