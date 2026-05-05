# Graph Report - .  (2026-05-05)

## Corpus Check
- 53 files · ~41,938 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 334 nodes · 560 edges · 25 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Models & Validation|API Models & Validation]]
- [[_COMMUNITY_VS Code Extension Core|VS Code Extension Core]]
- [[_COMMUNITY_Auth & Infrastructure|Auth & Infrastructure]]
- [[_COMMUNITY_Solutions Tab Design Spec|Solutions Tab Design Spec]]
- [[_COMMUNITY_FastAPI Services & Config|FastAPI Services & Config]]
- [[_COMMUNITY_API Routers & Services|API Routers & Services]]
- [[_COMMUNITY_Solutions Service & Tests|Solutions Service & Tests]]
- [[_COMMUNITY_Notebook Execution|Notebook Execution]]
- [[_COMMUNITY_Users & Webhooks|Users & Webhooks]]
- [[_COMMUNITY_Problems Sidebar Tree|Problems Sidebar Tree]]
- [[_COMMUNITY_Extension Refactor Options|Extension Refactor Options]]
- [[_COMMUNITY_Clerk JWT Auth|Clerk JWT Auth]]
- [[_COMMUNITY_Extension Activation|Extension Activation]]
- [[_COMMUNITY_Extension Entry Point|Extension Entry Point]]
- [[_COMMUNITY_FastAPI App Lifecycle|FastAPI App Lifecycle]]
- [[_COMMUNITY_Solutions Pydantic Models|Solutions Pydantic Models]]
- [[_COMMUNITY_Auth Callback Page|Auth Callback Page]]
- [[_COMMUNITY_Profile Page|Profile Page]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]
- [[_COMMUNITY_Judge Pipeline Rules|Judge Pipeline Rules]]
- [[_COMMUNITY_Solutions Config Models|Solutions Config Models]]
- [[_COMMUNITY_README|README]]
- [[_COMMUNITY_Health Endpoint|Health Endpoint]]
- [[_COMMUNITY_HintRevealResponse Model|HintRevealResponse Model]]
- [[_COMMUNITY_Test Solutions Plan|Test Solutions Plan]]

## God Nodes (most connected - your core abstractions)
1. `QLabApi` - 16 edges
2. `ProblemPanel` - 15 edges
3. `SubmissionStatus` - 11 edges
4. `JudgeResult` - 11 edges
5. `User Registration, Nickname and My Submissions Design Spec` - 10 edges
6. `submit()` - 9 edges
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
- `app (FastAPI)` --shares_data_with--> `MongoDB Collections`  [EXTRACTED]
  api/main.py → CLAUDE.md

## Communities

### Community 0 - "API Models & Validation"
Cohesion: 0.13
Nodes (37): code_must_be_single_param(), code_must_define_func(), CommunitySolution, Difficulty, EditorialTier, Example, HintRevealResponse, JudgeResult (+29 more)

### Community 1 - "VS Code Extension Core"
Cohesion: 0.1
Nodes (7): QLabApi, buildHtml(), esc(), nonce(), ProblemPanel, test_get_me_without_token_returns_401(), test_submit_without_token_returns_401()

### Community 2 - "Auth & Infrastructure"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 3 - "Solutions Tab Design Spec"
Cohesion: 0.11
Nodes (29): Community Tier, Content Tiers (Hints/Editorial/Reference/Community), editorial field (problems collection, markdown string), Editorial Tier, gate: attempts unlock rule, gate: correct unlock rule, Hints Tier, Lazy Loading (solutions fetch on tab click) (+21 more)

### Community 4 - "FastAPI Services & Config"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 5 - "API Routers & Services"
Cohesion: 0.12
Nodes (16): get_leaderboard(), get_problem(), list_problems(), get_solutions(), reveal_hint(), get_my_submissions(), submit(), main() (+8 more)

### Community 6 - "Solutions Service & Tests"
Cohesion: 0.19
Nodes (20): compute_solutions(), _get_top_community(), increment_hint_reveals(), _is_unlocked(), make_mock_db_for_router(), make_problem(), make_rsa_key_pair(), make_signing_key_mock() (+12 more)

### Community 7 - "Notebook Execution"
Cohesion: 0.19
Nodes (11): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+3 more)

### Community 8 - "Users & Webhooks"
Cohesion: 0.26
Nodes (6): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), set_nickname(), upsert()

### Community 9 - "Problems Sidebar Tree"
Cohesion: 0.18
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 10 - "Extension Refactor Options"
Cohesion: 0.24
Nodes (11): esbuild.js build script, Option A: Split Files (Quick Win), Option B: esbuild + TypeScript Webview, Option C: React Webview (Full GitLens-style), ProblemPanel.ts god file (1131 lines), Template Literal Backtick Escaping Bug, VS Code Extension Structural Improvements, src/webview/panel.css (+3 more)

### Community 11 - "Clerk JWT Auth"
Cohesion: 0.4
Nodes (8): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_invalid_token_raises_401(), test_valid_token_returns_claims()

### Community 12 - "Extension Activation"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 13 - "Extension Entry Point"
Cohesion: 0.53
Nodes (4): activate(), deactivate(), jwtIsExpired(), setSignedInContext()

### Community 14 - "FastAPI App Lifecycle"
Cohesion: 0.6
Nodes (2): health(), lifespan()

### Community 15 - "Solutions Pydantic Models"
Cohesion: 0.5
Nodes (4): CommunitySolution Pydantic model, EditorialTier Pydantic model, ReferenceTier Pydantic model, SolutionsResponse Pydantic model

### Community 16 - "Auth Callback Page"
Cohesion: 0.67
Nodes (1): handleCallback()

### Community 17 - "Profile Page"
Cohesion: 0.67
Nodes (1): fetchQlabUser()

### Community 18 - "Brand Assets"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 22 - "Judge Pipeline Rules"
Cohesion: 1.0
Nodes (2): Judge Pipeline, Submission Rules

### Community 23 - "Solutions Config Models"
Cohesion: 1.0
Nodes (2): SolutionsConfig Pydantic model, TierConfig Pydantic model

### Community 33 - "README"
Cohesion: 1.0
Nodes (1): qLab README

### Community 35 - "Health Endpoint"
Cohesion: 1.0
Nodes (1): health

### Community 39 - "HintRevealResponse Model"
Cohesion: 1.0
Nodes (1): HintRevealResponse Pydantic model

### Community 40 - "Test Solutions Plan"
Cohesion: 1.0
Nodes (1): tests/test_solutions.py

## Knowledge Gaps
- **34 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `qLab README` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `FastAPI App Lifecycle`** (5 nodes): `health()`, `lifespan()`, `main.py`, `main.py`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Callback Page`** (3 nodes): `handleCallback()`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Page`** (3 nodes): `page.tsx`, `fetchQlabUser()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Judge Pipeline Rules`** (2 nodes): `Judge Pipeline`, `Submission Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Solutions Config Models`** (2 nodes): `SolutionsConfig Pydantic model`, `TierConfig Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `README`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Endpoint`** (1 nodes): `health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HintRevealResponse Model`** (1 nodes): `HintRevealResponse Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Solutions Plan`** (1 nodes): `tests/test_solutions.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_run_q_process()` connect `API Models & Validation` to `VS Code Extension Core`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `submit()` connect `API Routers & Services` to `API Models & Validation`, `Users & Webhooks`, `VS Code Extension Core`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `JudgeResult` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`JudgeResult` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Models & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `VS Code Extension Core` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._