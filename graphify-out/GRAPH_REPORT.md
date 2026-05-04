# Graph Report - .  (2026-05-04)

## Corpus Check
- 5 files · ~5,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 229 nodes · 345 edges · 17 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Webhook Integration|Auth & Webhook Integration]]
- [[_COMMUNITY_VS Code Extension API Client|VS Code Extension API Client]]
- [[_COMMUNITY_FastAPI Services Layer|FastAPI Services Layer]]
- [[_COMMUNITY_Submission Validation Models|Submission Validation Models]]
- [[_COMMUNITY_Judge Pipeline|Judge Pipeline]]
- [[_COMMUNITY_Submissions & Problems|Submissions & Problems]]
- [[_COMMUNITY_Notebook Execution|Notebook Execution]]
- [[_COMMUNITY_Problems Tree Provider|Problems Tree Provider]]
- [[_COMMUNITY_Clerk JWT Auth|Clerk JWT Auth]]
- [[_COMMUNITY_Extension Auth & Concepts|Extension Auth & Concepts]]
- [[_COMMUNITY_Users & Webhooks Router|Users & Webhooks Router]]
- [[_COMMUNITY_Problem Panel Webview|Problem Panel Webview]]
- [[_COMMUNITY_FastAPI App Entry|FastAPI App Entry]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]
- [[_COMMUNITY_Judge & Submission Concepts|Judge & Submission Concepts]]
- [[_COMMUNITY_README|README]]
- [[_COMMUNITY_Health Check|Health Check]]

## God Nodes (most connected - your core abstractions)
1. `ProblemPanel` - 12 edges
2. `QLabApi` - 12 edges
3. `SubmissionStatus` - 10 edges
4. `JudgeResult` - 10 edges
5. `User Registration, Nickname and My Submissions Design Spec` - 10 edges
6. `submit()` - 9 edges
7. `FastAPI Backend` - 9 edges
8. `run_judge()` - 7 edges
9. `_run_q_process()` - 7 edges
10. `Authentication Design Spec` - 7 edges

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

### Community 0 - "Auth & Webhook Integration"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 1 - "VS Code Extension API Client"
Cohesion: 0.12
Nodes (4): QLabApi, activate(), ProblemPanel, test_submit_without_token_returns_401()

### Community 2 - "FastAPI Services Layer"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 3 - "Submission Validation Models"
Cohesion: 0.14
Nodes (17): Difficulty, Example, Language, LeaderboardEntry, MySubmissionEntry, NicknameRequest, ProblemDetail, ProblemSummary (+9 more)

### Community 4 - "Judge Pipeline"
Cohesion: 0.33
Nodes (13): JudgeResult, SubmissionStatus, _build_judge_script(), _escape_q_string(), Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load, Escape a string for embedding inside q double quotes., Main entry point. Runs the judge and returns a JudgeResult., Spawn q, wait for result, parse JSON from stdout. (+5 more)

### Community 5 - "Submissions & Problems"
Cohesion: 0.19
Nodes (10): get_my_submissions(), submit(), main(), get_by_id(), increment_solve_count(), upsert_from_json(), get_for_user(), get_leaderboard() (+2 more)

### Community 6 - "Notebook Execution"
Cohesion: 0.19
Nodes (11): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+3 more)

### Community 7 - "Problems Tree Provider"
Cohesion: 0.17
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 8 - "Clerk JWT Auth"
Cohesion: 0.35
Nodes (9): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_get_me_without_token_returns_401(), test_invalid_token_raises_401() (+1 more)

### Community 9 - "Extension Auth & Concepts"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 10 - "Users & Webhooks Router"
Cohesion: 0.31
Nodes (5): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), upsert()

### Community 11 - "Problem Panel Webview"
Cohesion: 0.83
Nodes (3): buildHtml(), esc(), nonce()

### Community 12 - "FastAPI App Entry"
Cohesion: 0.67
Nodes (2): health(), lifespan()

### Community 13 - "Brand Assets"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 18 - "Judge & Submission Concepts"
Cohesion: 1.0
Nodes (2): Judge Pipeline, Submission Rules

### Community 29 - "README"
Cohesion: 1.0
Nodes (1): qLab README

### Community 31 - "Health Check"
Cohesion: 1.0
Nodes (1): health

## Knowledge Gaps
- **20 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `qLab README` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `FastAPI App Entry`** (4 nodes): `health()`, `lifespan()`, `main.py`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Judge & Submission Concepts`** (2 nodes): `Judge Pipeline`, `Submission Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `README`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Check`** (1 nodes): `health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_run_q_process()` connect `Judge Pipeline` to `VS Code Extension API Client`, `Submissions & Problems`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `submit()` connect `Submissions & Problems` to `VS Code Extension API Client`, `Users & Webhooks Router`, `Submission Validation Models`, `Judge Pipeline`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `JudgeResult` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`JudgeResult` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Webhook Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `VS Code Extension API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._