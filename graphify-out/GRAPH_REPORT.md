# Graph Report - .  (2026-05-04)

## Corpus Check
- 0 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 212 nodes · 327 edges · 12 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_VS Code API Client|VS Code API Client]]
- [[_COMMUNITY_Auth & Platform Docs|Auth & Platform Docs]]
- [[_COMMUNITY_CLAUDE.md Architecture Docs|CLAUDE.md Architecture Docs]]
- [[_COMMUNITY_API Models & Validation|API Models & Validation]]
- [[_COMMUNITY_Judge Engine|Judge Engine]]
- [[_COMMUNITY_Submission & Problems Routers|Submission & Problems Routers]]
- [[_COMMUNITY_Notebook Service|Notebook Service]]
- [[_COMMUNITY_Problems Tree Provider|Problems Tree Provider]]
- [[_COMMUNITY_Clerk Auth Service|Clerk Auth Service]]
- [[_COMMUNITY_User & Webhook Routers|User & Webhook Routers]]
- [[_COMMUNITY_qLab Brand Assets|qLab Brand Assets]]
- [[_COMMUNITY_qLab README|qLab README]]

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
- `test_invalid_token_raises_401()` --calls--> `verify_clerk_token()`  [INFERRED]
  tests/test_auth.py → api/services/auth.py
- `test_valid_token_returns_claims()` --calls--> `verify_clerk_token()`  [INFERRED]
  tests/test_auth.py → api/services/auth.py
- `test_expired_token_raises_401()` --calls--> `verify_clerk_token()`  [INFERRED]
  tests/test_auth.py → api/services/auth.py
- `main()` --calls--> `upsert_from_json()`  [INFERRED]
  scripts/seed_problems.py → api/services/problems.py
- `Authentication Design Spec` --references--> `Next.js Web App (web/)`  [EXTRACTED]
  docs/superpowers/specs/2026-04-27-authentication-design.md → PRODUCTION.md

## Hyperedges (group relationships)
- **Judge Pipeline Flow** — claude_api_services_judge, claude_judge_harness_q, claude_q_judge_subprocess, claude_test_gen_q, claude_reference_q, claude_judge_result [EXTRACTED 0.95]
- **MongoDB Collections Data Store** — claude_mongodb, claude_problems_collection, claude_submissions_collection, claude_users_collection [EXTRACTED 1.00]
- **Problem Definition File Set** — claude_problem_json, claude_test_gen_q, claude_reference_q [EXTRACTED 0.95]

## Communities

### Community 0 - "VS Code API Client"
Cohesion: 0.1
Nodes (8): QLabApi, activate(), buildHtml(), esc(), nonce(), ProblemPanel, test_get_me_without_token_returns_401(), test_submit_without_token_returns_401()

### Community 1 - "Auth & Platform Docs"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 2 - "CLAUDE.md Architecture Docs"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 3 - "API Models & Validation"
Cohesion: 0.14
Nodes (17): Difficulty, Example, Language, LeaderboardEntry, MySubmissionEntry, NicknameRequest, ProblemDetail, ProblemSummary (+9 more)

### Community 4 - "Judge Engine"
Cohesion: 0.33
Nodes (13): JudgeResult, SubmissionStatus, _build_judge_script(), _escape_q_string(), Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load, Escape a string for embedding inside q double quotes., Main entry point. Runs the judge and returns a JudgeResult., Spawn q, wait for result, parse JSON from stdout. (+5 more)

### Community 5 - "Submission & Problems Routers"
Cohesion: 0.19
Nodes (10): get_my_submissions(), submit(), main(), get_by_id(), increment_solve_count(), upsert_from_json(), get_for_user(), get_leaderboard() (+2 more)

### Community 6 - "Notebook Service"
Cohesion: 0.19
Nodes (11): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+3 more)

### Community 7 - "Problems Tree Provider"
Cohesion: 0.18
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 8 - "Clerk Auth Service"
Cohesion: 0.4
Nodes (8): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_invalid_token_raises_401(), test_valid_token_returns_claims()

### Community 9 - "User & Webhook Routers"
Cohesion: 0.31
Nodes (5): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), upsert()

### Community 10 - "qLab Brand Assets"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 26 - "qLab README"
Cohesion: 1.0
Nodes (1): qLab README

## Knowledge Gaps
- **16 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `qLab README` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `qLab README`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_run_q_process()` connect `Judge Engine` to `VS Code API Client`, `Submission & Problems Routers`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `submit()` connect `Submission & Problems Routers` to `VS Code API Client`, `User & Webhook Routers`, `API Models & Validation`, `Judge Engine`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `ProblemsProvider` connect `Problems Tree Provider` to `VS Code API Client`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `JudgeResult` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`JudgeResult` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `VS Code API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._