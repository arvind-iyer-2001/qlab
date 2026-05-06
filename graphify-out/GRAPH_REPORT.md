# Graph Report - .  (2026-05-06)

## Corpus Check
- 76 files · ~53,038 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 369 nodes · 575 edges · 25 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Judge Validation & Models|Judge Validation & Models]]
- [[_COMMUNITY_VS Code Extension API Layer|VS Code Extension API Layer]]
- [[_COMMUNITY_Clerk Auth & Webhooks|Clerk Auth & Webhooks]]
- [[_COMMUNITY_Solutions Content & Tiers|Solutions Content & Tiers]]
- [[_COMMUNITY_API Services (Routing)|API Services (Routing)]]
- [[_COMMUNITY_Auth & Judge Services|Auth & Judge Services]]
- [[_COMMUNITY_Solutions Service & Testing|Solutions Service & Testing]]
- [[_COMMUNITY_Notebook Execution|Notebook Execution]]
- [[_COMMUNITY_Users & Webhooks|Users & Webhooks]]
- [[_COMMUNITY_Extension UI Components|Extension UI Components]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `QLabApi` - 16 edges
2. `ProblemPanel` - 15 edges
3. `SubmissionStatus` - 11 edges
4. `JudgeResult` - 11 edges
5. `submit()` - 10 edges
6. `User Registration, Nickname and My Submissions Design Spec` - 10 edges
7. `FastAPI Backend` - 9 edges
8. `compute_solutions()` - 9 edges
9. `run_judge()` - 7 edges
10. `_run_q_process()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `SignOut` --references--> `Clerk Auth`  [EXTRACTED]
  web/app/sign-out/page.tsx → CLAUDE.md
- `activate` --conceptually_related_to--> `Clerk Auth`  [INFERRED]
  vscode-extension/src/extension.ts → CLAUDE.md
- `uriHandler` --references--> `Clerk Auth`  [EXTRACTED]
  vscode-extension/src/extension.ts → CLAUDE.md
- `test_invalid_token_raises_401()` --calls--> `verify_clerk_token()`  [INFERRED]
  tests/test_auth.py → api/services/auth.py
- `submit()` --calls--> `handleSubmit()`  [INFERRED]
  api/routers/submissions.py → web/components/tabs/SubmitTab.tsx

## Communities

### Community 0 - "Judge Validation & Models"
Cohesion: 0.13
Nodes (37): code_must_be_single_param(), code_must_define_func(), CommunitySolution, Difficulty, EditorialTier, Example, HintRevealResponse, JudgeResult (+29 more)

### Community 1 - "VS Code Extension API Layer"
Cohesion: 0.1
Nodes (7): QLabApi, buildHtml(), esc(), nonce(), ProblemPanel, test_get_me_without_token_returns_401(), test_submit_without_token_returns_401()

### Community 2 - "Clerk Auth & Webhooks"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 3 - "Solutions Content & Tiers"
Cohesion: 0.11
Nodes (29): Community Tier, Content Tiers (Hints/Editorial/Reference/Community), editorial field (problems collection, markdown string), Editorial Tier, gate: attempts unlock rule, gate: correct unlock rule, Hints Tier, Lazy Loading (solutions fetch on tab click) (+21 more)

### Community 4 - "API Services (Routing)"
Cohesion: 0.11
Nodes (17): get_leaderboard(), get_problem(), list_problems(), get_solutions(), reveal_hint(), get_my_submissions(), submit(), main() (+9 more)

### Community 5 - "Auth & Judge Services"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 6 - "Solutions Service & Testing"
Cohesion: 0.19
Nodes (20): compute_solutions(), _get_top_community(), increment_hint_reveals(), _is_unlocked(), make_mock_db_for_router(), make_problem(), make_rsa_key_pair(), make_signing_key_mock() (+12 more)

### Community 7 - "Notebook Execution"
Cohesion: 0.18
Nodes (12): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+4 more)

### Community 8 - "Users & Webhooks"
Cohesion: 0.26
Nodes (6): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), set_nickname(), upsert()

### Community 9 - "Extension UI Components"
Cohesion: 0.18
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (11): esbuild.js build script, Option A: Split Files (Quick Win), Option B: esbuild + TypeScript Webview, Option C: React Webview (Full GitLens-style), ProblemPanel.ts god file (1131 lines), Template Literal Backtick Escaping Bug, VS Code Extension Structural Improvements, src/webview/panel.css (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (8): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_invalid_token_raises_401(), test_valid_token_returns_claims()

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.53
Nodes (4): activate(), deactivate(), jwtIsExpired(), setSignedInContext()

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (2): health(), lifespan()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): CommunitySolution Pydantic model, EditorialTier Pydantic model, ReferenceTier Pydantic model, SolutionsResponse Pydantic model

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (1): handleCallback()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (1): fetchQlabUser()

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): Judge Pipeline, Submission Rules

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): SolutionsConfig Pydantic model, TierConfig Pydantic model

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): qLab README

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): health

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): HintRevealResponse Pydantic model

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): tests/test_solutions.py

## Knowledge Gaps
- **35 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `qLab README` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (5 nodes): `health()`, `lifespan()`, `main.py`, `main.py`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `handleCallback()`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `page.tsx`, `fetchQlabUser()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Judge Pipeline`, `Submission Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `SolutionsConfig Pydantic model`, `TierConfig Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `HintRevealResponse Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `tests/test_solutions.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_run_q_process()` connect `Judge Validation & Models` to `VS Code Extension API Layer`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `submit()` connect `API Services (Routing)` to `Judge Validation & Models`, `Users & Webhooks`, `VS Code Extension API Layer`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `JudgeResult` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`JudgeResult` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Judge Validation & Models` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `VS Code Extension API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._