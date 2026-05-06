# Graph Report - .  (2026-05-06)

## Corpus Check
- 12 files · ~999,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 420 nodes · 663 edges · 30 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Problem Schema & Validation|Problem Schema & Validation]]
- [[_COMMUNITY_VS Code Extension Refactor Plans|VS Code Extension Refactor Plans]]
- [[_COMMUNITY_VS Code API Client|VS Code API Client]]
- [[_COMMUNITY_Auth & Webhooks Roadmap|Auth & Webhooks Roadmap]]
- [[_COMMUNITY_Product Roadmap|Product Roadmap]]
- [[_COMMUNITY_FastAPI Backend Core|FastAPI Backend Core]]
- [[_COMMUNITY_Solutions Service|Solutions Service]]
- [[_COMMUNITY_Submissions Service|Submissions Service]]
- [[_COMMUNITY_Problems & Seeding|Problems & Seeding]]
- [[_COMMUNITY_Notebook Q Service|Notebook Q Service]]
- [[_COMMUNITY_Users & Webhooks|Users & Webhooks]]
- [[_COMMUNITY_VS Code Tree Items|VS Code Tree Items]]
- [[_COMMUNITY_Clerk JWT Auth|Clerk JWT Auth]]
- [[_COMMUNITY_Extension Activation|Extension Activation]]
- [[_COMMUNITY_Extension Entry|Extension Entry]]
- [[_COMMUNITY_FastAPI Main|FastAPI Main]]
- [[_COMMUNITY_Solutions Pydantic Models|Solutions Pydantic Models]]
- [[_COMMUNITY_Web Problem Layout|Web Problem Layout]]
- [[_COMMUNITY_Auth Callback Page|Auth Callback Page]]
- [[_COMMUNITY_Profile Page|Profile Page]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]
- [[_COMMUNITY_My Submissions Hook|My Submissions Hook]]
- [[_COMMUNITY_Web API Client|Web API Client]]
- [[_COMMUNITY_My Submissions Tab|My Submissions Tab]]
- [[_COMMUNITY_Judge Spec|Judge Spec]]
- [[_COMMUNITY_Solutions Config Models|Solutions Config Models]]
- [[_COMMUNITY_qLab README|qLab README]]
- [[_COMMUNITY_health|health]]
- [[_COMMUNITY_HintRevealResponse Pydantic model|HintRevealResponse Pydantic model]]
- [[_COMMUNITY_teststest_solutions.py|tests/test_solutions.py]]

## God Nodes (most connected - your core abstractions)
1. `QLabApi` - 16 edges
2. `ProblemPanel` - 15 edges
3. `Web My Submissions Tab Design Spec` - 13 edges
4. `SubmissionStatus` - 11 edges
5. `JudgeResult` - 11 edges
6. `submit()` - 10 edges
7. `User Registration, Nickname and My Submissions Design Spec` - 10 edges
8. `Web My Submissions Tab Implementation Plan` - 10 edges
9. `get_for_user()` - 9 edges
10. `FastAPI Backend` - 9 edges

## Surprising Connections (you probably didn't know these)
- `SignOut` --references--> `Clerk Auth`  [EXTRACTED]
  web/app/sign-out/page.tsx → CLAUDE.md
- `activate` --conceptually_related_to--> `Clerk Auth`  [INFERRED]
  vscode-extension/src/extension.ts → CLAUDE.md
- `uriHandler` --references--> `Clerk Auth`  [EXTRACTED]
  vscode-extension/src/extension.ts → CLAUDE.md
- `Web My Submissions Tab (FUTURE)` --semantically_similar_to--> `Web My Submissions Tab Design Spec`  [INFERRED] [semantically similar]
  FUTURE.md → docs/superpowers/specs/2026-05-06-web-submissions-tab-design.md
- `test_invalid_token_raises_401()` --calls--> `verify_clerk_token()`  [INFERRED]
  tests/test_auth.py → api/services/auth.py

## Hyperedges (group relationships)
- **My Submissions Tab end-to-end stack** —  [EXTRACTED 1.00]
- **Click-to-load with dirty-check confirm** —  [EXTRACTED 1.00]
- **Plan-Spec-Roadmap alignment for web My Submissions** —  [EXTRACTED 1.00]

## Communities

### Community 0 - "Problem Schema & Validation"
Cohesion: 0.13
Nodes (37): code_must_be_single_param(), code_must_define_func(), CommunitySolution, Difficulty, EditorialTier, Example, HintRevealResponse, JudgeResult (+29 more)

### Community 1 - "VS Code Extension Refactor Plans"
Cohesion: 0.07
Nodes (40): esbuild.js build script, Option A: Split Files (Quick Win), Option B: esbuild + TypeScript Webview, Option C: React Webview (Full GitLens-style), ProblemPanel.ts god file (1131 lines), Template Literal Backtick Escaping Bug, VS Code Extension Structural Improvements, src/webview/panel.css (+32 more)

### Community 2 - "VS Code API Client"
Cohesion: 0.1
Nodes (7): QLabApi, buildHtml(), esc(), nonce(), ProblemPanel, test_get_me_without_token_returns_401(), test_submit_without_token_returns_401()

### Community 3 - "Auth & Webhooks Roadmap"
Cohesion: 0.12
Nodes (32): /auth/callback Next.js Page, Clerk Authentication Provider, POST /webhooks/clerk Endpoint, Docker Container Judge Sandbox, qLab Future Improvements Backlog, qLab Implementation Summary (Phases 2-4), MongoDB with motor async driver, MongoDB problems Collection (+24 more)

### Community 4 - "Product Roadmap"
Cohesion: 0.11
Nodes (30): Auth & Users Roadmap, Backend / API Roadmap, Clerk Authentication, Content & Problems Roadmap, Infrastructure & Quality, MongoDB Migration (Phase 2), Web My Submissions Tab (FUTURE), Web/Extension Parity Table (+22 more)

### Community 5 - "FastAPI Backend Core"
Cohesion: 0.12
Nodes (27): api/services/auth.py, api/services/judge.py, Clerk Auth, deps.get_db, FastAPI Backend, func Submission, graphify Knowledge Graph, judge/harness.q (+19 more)

### Community 6 - "Solutions Service"
Cohesion: 0.19
Nodes (20): compute_solutions(), _get_top_community(), increment_hint_reveals(), _is_unlocked(), make_mock_db_for_router(), make_problem(), make_rsa_key_pair(), make_signing_key_mock() (+12 more)

### Community 7 - "Submissions Service"
Cohesion: 0.16
Nodes (10): get_my_submissions(), submit(), get_for_user(), get_leaderboard(), insert(), handleSubmit(), _AsyncCursor, _Db (+2 more)

### Community 8 - "Problems & Seeding"
Cohesion: 0.16
Nodes (11): get_leaderboard(), get_problem(), list_problems(), get_solutions(), reveal_hint(), main(), get_all(), get_by_id() (+3 more)

### Community 9 - "Notebook Q Service"
Cohesion: 0.18
Nodes (12): execute(), ExecuteRequest, reset(), _conn(), _escape(), execute_cell(), Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (, Escape a code string for embedding inside a q double-quoted string. (+4 more)

### Community 10 - "Users & Webhooks"
Cohesion: 0.26
Nodes (6): get_me(), set_nickname(), clerk_webhook(), get_by_clerk_id(), set_nickname(), upsert()

### Community 11 - "VS Code Tree Items"
Cohesion: 0.18
Nodes (4): DifficultyGroup, ErrorItem, ProblemItem, ProblemsProvider

### Community 12 - "Clerk JWT Auth"
Cohesion: 0.4
Nodes (8): _get_jwks_client(), verify_clerk_token(), make_rsa_key_pair(), make_signing_key_mock(), make_token(), test_expired_token_raises_401(), test_invalid_token_raises_401(), test_valid_token_returns_claims()

### Community 13 - "Extension Activation"
Cohesion: 0.31
Nodes (10): Clerk Auth, MongoDB Collections, activate, setSignedInContext, uriHandler, app (FastAPI), lifespan, SignOut (+2 more)

### Community 14 - "Extension Entry"
Cohesion: 0.53
Nodes (4): activate(), deactivate(), jwtIsExpired(), setSignedInContext()

### Community 15 - "FastAPI Main"
Cohesion: 0.6
Nodes (2): health(), lifespan()

### Community 16 - "Solutions Pydantic Models"
Cohesion: 0.5
Nodes (4): CommunitySolution Pydantic model, EditorialTier Pydantic model, ReferenceTier Pydantic model, SolutionsResponse Pydantic model

### Community 17 - "Web Problem Layout"
Cohesion: 0.67
Nodes (2): handleLoadCode(), starterCode()

### Community 18 - "Auth Callback Page"
Cohesion: 0.67
Nodes (1): handleCallback()

### Community 19 - "Profile Page"
Cohesion: 0.67
Nodes (1): fetchQlabUser()

### Community 20 - "Brand Assets"
Cohesion: 0.67
Nodes (3): qLab Brand Icon Concept, qLab VS Code Extension Icon (PNG), qLab VS Code Extension Icon (SVG)

### Community 21 - "My Submissions Hook"
Cohesion: 0.67
Nodes (1): useMySubmissions()

### Community 22 - "Web API Client"
Cohesion: 0.67
Nodes (1): apiFetch()

### Community 23 - "My Submissions Tab"
Cohesion: 0.67
Nodes (1): formatDate()

### Community 27 - "Judge Spec"
Cohesion: 1.0
Nodes (2): Judge Pipeline, Submission Rules

### Community 28 - "Solutions Config Models"
Cohesion: 1.0
Nodes (2): SolutionsConfig Pydantic model, TierConfig Pydantic model

### Community 47 - "qLab README"
Cohesion: 1.0
Nodes (1): qLab README

### Community 49 - "health"
Cohesion: 1.0
Nodes (1): health

### Community 53 - "HintRevealResponse Pydantic model"
Cohesion: 1.0
Nodes (1): HintRevealResponse Pydantic model

### Community 54 - "tests/test_solutions.py"
Cohesion: 1.0
Nodes (1): tests/test_solutions.py

## Knowledge Gaps
- **44 isolated node(s):** `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form`, `Kill whatever is running on NB_PORT and spawn a fresh q process there.     Uses`, `qLab README` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `FastAPI Main`** (5 nodes): `health()`, `lifespan()`, `main.py`, `main.py`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Web Problem Layout`** (4 nodes): `handleLoadCode()`, `starterCode()`, `ProblemLayout.tsx`, `ProblemLayout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Callback Page`** (3 nodes): `handleCallback()`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Page`** (3 nodes): `page.tsx`, `fetchQlabUser()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Submissions Hook`** (3 nodes): `useMySubmissions.ts`, `useMySubmissions()`, `useMySubmissions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Web API Client`** (3 nodes): `api.ts`, `apiFetch()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Submissions Tab`** (3 nodes): `MySubmissionsTab.tsx`, `formatDate()`, `MySubmissionsTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Judge Spec`** (2 nodes): `Judge Pipeline`, `Submission Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Solutions Config Models`** (2 nodes): `SolutionsConfig Pydantic model`, `TierConfig Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `qLab README`** (1 nodes): `qLab README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `health`** (1 nodes): `health`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HintRevealResponse Pydantic model`** (1 nodes): `HintRevealResponse Pydantic model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tests/test_solutions.py`** (1 nodes): `tests/test_solutions.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `submit()` connect `Submissions Service` to `Problem Schema & Validation`, `Problems & Seeding`, `Users & Webhooks`, `VS Code API Client`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `_run_q_process()` connect `Problem Schema & Validation` to `VS Code API Client`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SubmissionStatus` (e.g. with `Judge service — spawns a sandboxed q subprocess per submission.  Flow:   1. Load` and `Returns an error string if func uses multiple params, else None.     Catches: fu`) actually correct?**
  _`SubmissionStatus` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Notebook execution service.  Connects to a dedicated q process on QLAB_NB_PORT (`, `Escape a code string for embedding inside a q double-quoted string.`, `Evaluate cell_code on the notebook q process and return the result     as a form` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Problem Schema & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `VS Code Extension Refactor Plans` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `VS Code API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._