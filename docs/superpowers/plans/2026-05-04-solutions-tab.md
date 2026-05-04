# Solutions / Editorial Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Solutions tab to the qLab VS Code panel with four progressively-unlocked content tiers: hints (one-at-a-time), editorial (markdown), reference solution (canonical q code), and community top solutions (leaderboard entries with code).

**Architecture:** A single server-gated endpoint `GET /problems/:slug/solutions` (auth required) computes what the authenticated user has unlocked based on their submission history and the per-problem `solutions_config`, then returns only unlocked content. A second endpoint `POST /problems/:slug/solutions/hints/reveal` increments a per-user hint counter stored in a new `hint_reveals` MongoDB collection. The extension renders the response as a tabbed Solutions panel with four sub-tabs.

**Tech Stack:** Python/FastAPI/Motor (backend), TypeScript/VS Code Webview API (extension), MongoDB (hint_reveals collection), pytest/unittest.mock (tests)

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `problems/*/problem.json` (all 5) | Add `solutions_config` and `editorial` fields |
| Modify | `api/models.py` | Add `SolutionsConfig`, `SolutionsResponse`, `HintRevealResponse` |
| Modify | `api/services/problems.py` | Exclude `editorial`/`reference_solution`/`solutions_config` from summary projection |
| Create | `api/services/solutions.py` | Gate logic, hint_reveals read/write, community solutions fetch |
| Modify | `scripts/seed_problems.py` | Read `reference.q` content, seed `reference_solution` field |
| Create | `api/routers/solutions.py` | `GET /:slug/solutions`, `POST /:slug/solutions/hints/reveal` |
| Modify | `api/main.py` | Register solutions router; add `hint_reveals` unique index on startup |
| Create | `tests/test_solutions.py` | Unit tests for gate logic and router endpoints |
| Modify | `vscode-extension/src/api.ts` | Add `authPost`, `SolutionsResponse`, `getSolutions`, `revealNextHint` |
| Modify | `vscode-extension/src/ProblemPanel.ts` | Add Solutions tab with 4 sub-tabs, lock overlay, reveal button |

---

## Task 1: Add `solutions_config` and `editorial` to all five `problem.json` files

**Files:**
- Modify: `problems/p001_same_same/problem.json`
- Modify: `problems/p002_brogans_badges/problem.json`
- Modify: `problems/p003_zoolander_strut/problem.json`
- Modify: `problems/p004_rituls_tabs/problem.json`
- Modify: `problems/p005_arvind_travels/problem.json`

- [ ] **Step 1: Add fields to p001_same_same/problem.json**

Add these two top-level keys (alongside the existing fields):

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
},
"editorial": "## Approach\n\nGiven a table card `x[0]` and a hand `x[1]` (5 cards), you need to check if any card shares a rank **or** suit.\n\n### Key q insight: matrix indexing\n\nIn q, a list of 2-char strings is a matrix. You can extract a whole column in one shot:\n\n```q\nx[1][;0]  / all rank chars, e.g. \"ATJK2\"\nx[1][;1]  / all suit chars, e.g. \"HCSDH\"\n```\n\n### Step-by-step\n\n1. Extract the table rank: `x[0;0]` and table suit: `x[0;1]`\n2. Check `x[0;0] in x[1][;0]` — is the rank in any hand card?\n3. Check `x[0;1] in x[1][;1]` — is the suit in any hand card?\n4. Return `\"YES\"` if either is true, else `\"NO\"`\n\n```q\nfunc:{$[x[0;0]in x[1;;0];\"YES\";x[0;1]in x[1;;1];\"YES\";\"NO\"]}\n```\n\n`$[cond;true;cond2;true2;false]` is q's multi-way conditional — it short-circuits on the first true condition.\n\n### Optimising further\n\nCan you express both checks as a single `any` over a combined boolean list? Try `any x[0]in'flip x[1]`."
```

- [ ] **Step 2: Add fields to p002_brogans_badges/problem.json**

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
},
"editorial": "## Approach\n\nYou need `2*n` black sheets, `5*n` yellow sheets, and `8*n` red sheets. Each notebook holds `k` sheets, so you need `ceil(sheets_needed / k)` notebooks per colour.\n\n### Key q insight: implicit iteration over lists\n\nInstead of looping over the three colours, operate on the list `2 5 8` all at once:\n\n```q\n(2 5 8) * x[0]    / total sheets per colour (a 3-element list)\n% x[1]            / divide each by k (q's % is float division)\nceiling           / ceil each result element-wise\nsum               / add all three together\n```\n\nCombined into one expression:\n\n```q\nfunc:{sum ceiling(2 5 8)*x[0]%x 1}\n```\n\n`ceiling` applies element-wise to lists in q — no explicit loop needed. This is the idiomatic q approach: express the computation as a data transformation over the whole list."
```

- [ ] **Step 3: Add fields to p003_zoolander_strut/problem.json**

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
},
"editorial": "## Approach\n\nTo go from top-left to bottom-right in a `cols × rows` grid you must make exactly `(cols-1)` right moves and `(rows-1)` down moves. The number of distinct orderings is the **binomial coefficient**:\n\n```\nC(cols + rows - 2,  min(cols, rows) - 1)\n```\n\n### Why this formula?\n\nYou have `(cols+rows-2)` total moves, and you choose which `min(cols,rows)-1` of them are in the minority direction. The rest follow automatically.\n\n### Computing C(n, k) iteratively in q\n\nUsing the multiplicative formula `C(n,k) = n/1 * (n-1)/2 * ... * (n-k+1)/k`:\n\n```q\nfunc:{{(x*y)div z}/[1;-2+sum[x]-t;1+t:til -1+min x]}\n```\n\nBreaking it down:\n- `t: til -1+min x` — indices `0 1 ... (k-2)` where `k = min(cols,rows)`\n- `-2+sum[x]-t` — numerator terms `(n-k+1) ... n` where `n = cols+rows-2`\n- `1+t` — denominator terms `1 2 ... (k-1)`\n- `/[seed; nums; denoms]` — over with 3 arguments: applies `{(acc*num)div den}` across paired lists\n\n### Simpler starting point\n\nBefore going for the closed form, try a dynamic programming approach — build a `cols × rows` grid where each cell = left neighbour + top neighbour."
```

- [ ] **Step 4: Add fields to p004_rituls_tabs/problem.json**

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
},
"editorial": "## Approach\n\nClosing every k-th tab starting from `b` removes exactly the tabs at positions with the same value `mod k` as `b`. There are exactly `k` such residue classes (0 through k-1). Your goal: choose the residue class to remove that **maximises** `|remaining sum|`.\n\n### Key steps\n\n1. Assign each tab a residue class: `(til count x) mod k`\n2. Sum all tabs in each residue class into an array `s` of length `k`\n3. For each class j: removing it leaves `sum[x] - s[j]`. Compute `|sum[x] - s[j]|` for all j.\n4. Return the maximum.\n\n### q implementation\n\n```q\nfunc:{\n  k:x 0; tabs:x 1;\n  i:(til count tabs) mod k;   / residue class of each tab\n  s:k#0;                       / accumulator: k zeros\n  s[i]+:tabs;                  / s[j] = sum of tabs in class j\n  max abs sum[tabs]-s          / best |remaining| over all removals\n}\n```\n\n`s[i]+:tabs` is q's indexed assignment — for each position, add its value to its class bucket. This replaces a nested loop in one line.\n\n### Edge case\n\nNote that `1` represents a study tab and `-1` a music tab. `sum[tabs]` is the total net score before any removal."
```

- [ ] **Step 5: Add fields to p005_arvind_travels/problem.json**

```json
"solutions_config": {
  "editorial":  { "gate": "attempts", "attempts_required": 3 },
  "reference":  { "gate": "correct" },
  "community":  { "gate": "attempts", "attempts_required": 1 }
},
"editorial": "## Approach\n\nCity prices are strictly increasing: city 1 costs $1/L, city 2 costs $2/L, and so on. Since future fuel is **always more expensive**, the optimal strategy is to buy as much cheap fuel as possible now.\n\n### Greedy insight\n\nAt every city, fill the tank to capacity `v`. This maximises the amount of cheap fuel you carry forward. Never leave a cheap city with a partially full tank.\n\n### Special case\n\nIf `v >= n-1`, a single fill at city 1 (`n-1` litres at $1 each) gets you all the way to city n. Cost = `n-1`.\n\n### General case (`v < n-1`)\n\nYou make stops at cities `1, v+1, 2v+1, 3v+1, ...` — each time filling to `v` (or however much you need to reach city n).\n\nA clear simulation:\n\n```q\nfunc:{[x]\n  n:x[0]; v:x[1]; pos:1; fuel:0f; cost:0f;\n  while[pos<n;\n    need:(n-pos)&v;         / litres needed: cap at v or distance to n\n    buy:need-fuel;           / only buy what we lack\n    if[0<buy; cost+:buy*pos; fuel+:buy];\n    pos+:1; fuel-:1;\n  ];\n  `long$cost}\n```\n\nAt each city: compute how many litres you need (to reach n or fill tank, whichever is less), buy the shortfall at the current price, then drive one kilometre."
```

- [ ] **Step 6: Verify all 5 files are valid JSON**

```bash
for p in p001_same_same p002_brogans_badges p003_zoolander_strut p004_rituls_tabs p005_arvind_travels; do
  python3 -c "import json; json.load(open('problems/$p/problem.json'))" && echo "$p OK"
done
```

Expected: five `OK` lines with no errors.

- [ ] **Step 7: Commit**

```bash
git add problems/
git commit -m "feat(problems): add solutions_config and editorial to all 5 problems"
```

---

## Task 2: Add Pydantic models for solutions

**Files:**
- Modify: `api/models.py`
- Test: `tests/test_solutions.py`

- [ ] **Step 1: Add models to api/models.py**

Add after the existing `MySubmissionEntry` class:

```python
from typing import Literal


class TierConfig(BaseModel):
    gate: Literal["attempts", "correct"]
    attempts_required: Optional[int] = None


class SolutionsConfig(BaseModel):
    editorial: TierConfig = TierConfig(gate="correct")
    reference: TierConfig = TierConfig(gate="correct")
    community: TierConfig = TierConfig(gate="attempts", attempts_required=1)


class EditorialTier(BaseModel):
    locked: bool
    reason: Optional[str] = None
    content: Optional[str] = None  # present when locked=False


class ReferenceTier(BaseModel):
    locked: bool
    reason: Optional[str] = None
    code: Optional[str] = None  # present when locked=False


class CommunitySolution(BaseModel):
    rank: int
    handle: str
    timing_ms: int
    char_count: int
    language: Language
    code: str


class SolutionsResponse(BaseModel):
    attempt_count: int
    hints_revealed: int
    hints_total: int
    hints: list[str]
    editorial: EditorialTier
    reference: ReferenceTier
    community: list[CommunitySolution]


class HintRevealResponse(BaseModel):
    hint: str
    revealed: int
    total: int
```

Update the existing import at the top of `api/models.py` from `from typing import Optional` to `from typing import Literal, Optional`.

- [ ] **Step 2: Write a quick smoke test to verify models parse correctly**

Add to `tests/test_solutions.py` (create new file):

```python
from api.models import (
    SolutionsConfig, TierConfig, EditorialTier, ReferenceTier,
    CommunitySolution, SolutionsResponse, HintRevealResponse, Language
)


def test_solutions_config_defaults():
    cfg = SolutionsConfig()
    assert cfg.reference.gate == "correct"
    assert cfg.community.gate == "attempts"
    assert cfg.community.attempts_required == 1


def test_solutions_response_locked():
    resp = SolutionsResponse(
        attempt_count=0,
        hints_revealed=0,
        hints_total=3,
        hints=[],
        editorial=EditorialTier(locked=True, reason="Submit 3 more attempts to unlock"),
        reference=ReferenceTier(locked=True, reason="Solve the problem to unlock"),
        community=[],
    )
    assert resp.editorial.locked is True
    assert resp.reference.code is None


def test_community_solution_model():
    sol = CommunitySolution(
        rank=1, handle="qwizard", timing_ms=12,
        char_count=43, language=Language.q, code="func:{x}"
    )
    assert sol.rank == 1
```

- [ ] **Step 3: Run tests**

```bash
pytest tests/test_solutions.py -v
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add api/models.py tests/test_solutions.py
git commit -m "feat(models): add SolutionsConfig, SolutionsResponse, HintRevealResponse"
```

---

## Task 3: Update summary projection to exclude new problem fields

**Files:**
- Modify: `api/services/problems.py`

- [ ] **Step 1: Add new fields to `_SUMMARY_PROJECTION`**

In `api/services/problems.py`, update `_SUMMARY_PROJECTION` to also exclude the three new fields so they don't appear in `GET /problems`:

```python
_SUMMARY_PROJECTION = {
    "_id": 0,
    "narrative": 0,
    "input_spec": 0,
    "output_spec": 0,
    "examples": 0,
    "hints": 0,
    "winning_criteria": 0,
    "test_call": 0,
    "judge_seed": 0,
    "editorial": 0,
    "reference_solution": 0,
    "solutions_config": 0,
}
```

- [ ] **Step 2: Run existing tests to make sure nothing broke**

```bash
pytest tests/ -v
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add api/services/problems.py
git commit -m "fix(problems): exclude editorial and solutions fields from summary projection"
```

---

## Task 4: Create `api/services/solutions.py`

**Files:**
- Create: `api/services/solutions.py`
- Modify: `tests/test_solutions.py`

- [ ] **Step 1: Write failing tests for the gate logic**

Add to `tests/test_solutions.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def make_problem(solutions_config=None, hints=None, editorial=None, reference_solution=None):
    return {
        "id": 1,
        "slug": "p001_same_same",
        "hints": hints or ["hint1", "hint2", "hint3"],
        "editorial": editorial or "## Editorial content",
        "reference_solution": reference_solution or "func:{x}",
        "solutions_config": solutions_config or {
            "editorial":  {"gate": "attempts", "attempts_required": 3},
            "reference":  {"gate": "correct"},
            "community":  {"gate": "attempts", "attempts_required": 1},
        },
    }


@pytest.mark.asyncio
async def test_no_attempts_returns_all_locked():
    from api.services.solutions import compute_solutions

    db = MagicMock()
    db.submissions.count_documents = AsyncMock(return_value=0)
    db.hint_reveals.find_one = AsyncMock(return_value=None)
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])

    result = await compute_solutions(db, make_problem(), "user_abc")

    assert result["attempt_count"] == 0
    assert result["hints_revealed"] == 0
    assert result["editorial"]["locked"] is True
    assert result["reference"]["locked"] is True
    assert result["community"] == []


@pytest.mark.asyncio
async def test_one_attempt_unlocks_community_not_editorial():
    from api.services.solutions import compute_solutions

    db = MagicMock()
    # count_documents called twice: total attempts, then correct attempts
    db.submissions.count_documents = AsyncMock(side_effect=[1, 0])
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 0})
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(
        return_value=[{"handle": "qwizard", "timing_ms": 12, "char_count": 43, "language": "q", "code": "func:{x}"}]
    )

    result = await compute_solutions(db, make_problem(), "user_abc")

    assert result["attempt_count"] == 1
    assert result["editorial"]["locked"] is True
    assert "Submit 2 more" in result["editorial"]["reason"]
    assert result["reference"]["locked"] is True
    assert len(result["community"]) == 1
    assert result["community"][0]["rank"] == 1


@pytest.mark.asyncio
async def test_three_attempts_unlocks_editorial():
    from api.services.solutions import compute_solutions

    db = MagicMock()
    db.submissions.count_documents = AsyncMock(side_effect=[3, 0])
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 2})
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])

    result = await compute_solutions(db, make_problem(), "user_abc")

    assert result["editorial"]["locked"] is False
    assert result["editorial"]["content"] == "## Editorial content"
    assert result["reference"]["locked"] is True  # still needs correct submission
    assert result["hints"] == ["hint1", "hint2"]  # 2 revealed


@pytest.mark.asyncio
async def test_correct_submission_unlocks_reference():
    from api.services.solutions import compute_solutions

    db = MagicMock()
    db.submissions.count_documents = AsyncMock(side_effect=[5, 1])  # 5 attempts, 1 correct
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 3})
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])

    result = await compute_solutions(db, make_problem(), "user_abc")

    assert result["reference"]["locked"] is False
    assert result["reference"]["code"] == "func:{x}"
    assert result["hints"] == ["hint1", "hint2", "hint3"]  # all 3 revealed


@pytest.mark.asyncio
async def test_increment_hint_reveals_returns_new_count():
    from api.services.solutions import increment_hint_reveals

    db = MagicMock()
    db.hint_reveals.find_one_and_update = AsyncMock(return_value={"revealed_count": 2})

    result = await increment_hint_reveals(db, "user_abc", 1, max_count=3)
    assert result == 2


@pytest.mark.asyncio
async def test_increment_hint_reveals_at_max_returns_none():
    from api.services.solutions import increment_hint_reveals

    db = MagicMock()
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 3})

    result = await increment_hint_reveals(db, "user_abc", 1, max_count=3)
    assert result is None
```

- [ ] **Step 2: Run to confirm all fail**

```bash
pytest tests/test_solutions.py -v -k "test_no_attempts or test_one_attempt or test_three or test_correct or test_increment"
```

Expected: all 6 fail with `ModuleNotFoundError: No module named 'api.services.solutions'`

- [ ] **Step 3: Create `api/services/solutions.py`**

```python
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument


def _is_unlocked(gate: str, attempts_required: int | None, attempt_count: int, has_correct: bool) -> tuple[bool, str]:
    if gate == "correct":
        if not has_correct:
            return False, "Solve the problem to unlock"
        return True, ""
    # gate == "attempts"
    required = attempts_required or 1
    remaining = max(0, required - attempt_count)
    if remaining > 0:
        word = "attempt" if remaining == 1 else "attempts"
        return False, f"Submit {remaining} more {word} to unlock"
    return True, ""


async def compute_solutions(
    db: AsyncIOMotorDatabase,
    problem: dict,
    clerk_user_id: str,
) -> dict:
    problem_id = problem["id"]

    attempt_count = await db.submissions.count_documents(
        {"user_id": clerk_user_id, "problem_id": problem_id}
    )
    correct_count = await db.submissions.count_documents(
        {"user_id": clerk_user_id, "problem_id": problem_id, "status": "correct"}
    )
    has_correct = correct_count > 0

    hint_doc = await db.hint_reveals.find_one(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id}
    )
    revealed_count = (hint_doc or {}).get("revealed_count", 0)

    hints = problem.get("hints", [])
    revealed_count = min(revealed_count, len(hints))
    config = problem.get("solutions_config", {})

    def tier(name: str) -> tuple[bool, str]:
        cfg = config.get(name, {})
        return _is_unlocked(
            cfg.get("gate", "correct"),
            cfg.get("attempts_required"),
            attempt_count,
            has_correct,
        )

    ed_ok, ed_reason = tier("editorial")
    if ed_ok:
        editorial = {"locked": False, "content": problem.get("editorial")}
    else:
        editorial = {"locked": True, "reason": ed_reason}

    ref_ok, ref_reason = tier("reference")
    if ref_ok:
        reference = {"locked": False, "code": problem.get("reference_solution")}
    else:
        reference = {"locked": True, "reason": ref_reason}

    comm_ok, _ = tier("community")
    if comm_ok:
        community = await _get_top_community(db, problem_id)
    else:
        community = []

    return {
        "attempt_count": attempt_count,
        "hints_revealed": revealed_count,
        "hints_total": len(hints),
        "hints": hints[:revealed_count],
        "editorial": editorial,
        "reference": reference,
        "community": community,
    }


async def _get_top_community(db: AsyncIOMotorDatabase, problem_id: int, limit: int = 5) -> list[dict]:
    cursor = (
        db.submissions.find(
            {"problem_id": problem_id, "status": "correct"},
            {"_id": 0, "handle": 1, "timing_ms": 1, "char_count": 1, "language": 1, "code": 1},
        )
        .sort([("timing_ms", 1), ("char_count", 1)])
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    return [{"rank": i + 1, **r} for i, r in enumerate(rows)]


async def increment_hint_reveals(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    problem_id: int,
    max_count: int,
) -> int | None:
    current = await db.hint_reveals.find_one(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id}
    )
    current_count = (current or {}).get("revealed_count", 0)
    if current_count >= max_count:
        return None

    doc = await db.hint_reveals.find_one_and_update(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id},
        {"$inc": {"revealed_count": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["revealed_count"]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_solutions.py -v -k "test_no_attempts or test_one_attempt or test_three or test_correct or test_increment"
```

Expected: all 6 pass.

- [ ] **Step 5: Commit**

```bash
git add api/services/solutions.py tests/test_solutions.py
git commit -m "feat(solutions): add compute_solutions and increment_hint_reveals service"
```

---

## Task 5: Update `scripts/seed_problems.py` to read `reference.q`

**Files:**
- Modify: `scripts/seed_problems.py`

- [ ] **Step 1: Update the seed loop to read reference.q**

In `scripts/seed_problems.py`, update the loop inside `main()`:

```python
    for p in sorted(PROBLEMS_DIR.iterdir()):
        meta_path = p / "problem.json"
        ref_path = p / "reference.q"
        if not p.is_dir() or not meta_path.exists():
            continue
        data = json.loads(meta_path.read_text())
        data["slug"] = p.name
        # Read reference solution from disk and store in MongoDB
        if ref_path.exists():
            data["reference_solution"] = ref_path.read_text().strip()
        await problems_svc.upsert_from_json(db, data)
        print(f"  {p.name}")
        count += 1
```

Also add the `hint_reveals` index alongside the existing indexes:

```python
    await db.hint_reveals.create_index(
        [("clerk_user_id", 1), ("problem_id", 1)], unique=True
    )
```

Add this line after the existing `await db.users.create_index(...)` line.

- [ ] **Step 2: Run the seed script to verify it works end-to-end**

```bash
cd /home/aiyer/qlab
python3 scripts/seed_problems.py
```

Expected output:
```
Creating indexes...
Seeding problems from .../problems...
  p001_same_same
  p002_brogans_badges
  p003_zoolander_strut
  p004_rituls_tabs
  p005_arvind_travels

Done — seeded 5 problem(s).
```

- [ ] **Step 3: Spot-check that reference_solution was stored**

```bash
python3 - <<'EOF'
import asyncio, os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    db = client[os.getenv("MONGODB_DB", "qlab")]
    doc = await db.problems.find_one({"slug": "p001_same_same"}, {"reference_solution": 1, "editorial": 1, "_id": 0})
    print("reference_solution present:", bool(doc.get("reference_solution")))
    print("editorial present:", bool(doc.get("editorial")))
    client.close()

asyncio.run(check())
EOF
```

Expected:
```
reference_solution present: True
editorial present: True
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed_problems.py
git commit -m "feat(seed): seed reference_solution from reference.q and add hint_reveals index"
```

---

## Task 6: Create `api/routers/solutions.py` and register it

**Files:**
- Create: `api/routers/solutions.py`
- Modify: `api/main.py`
- Modify: `tests/test_solutions.py`

- [ ] **Step 1: Write failing router tests**

Add to `tests/test_solutions.py`:

```python
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock


def make_mock_db(attempt_count=0, correct_count=0, hints=None, editorial="## editorial", ref_sol="func:{x}", revealed=0):
    db = MagicMock()
    db.submissions.count_documents = AsyncMock(side_effect=[attempt_count, correct_count])
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": revealed} if revealed else None)
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    db.users.find_one = AsyncMock(return_value={"clerk_user_id": "user_abc"})
    db.problems.find_one = AsyncMock(return_value={
        "id": 1, "slug": "p001_same_same",
        "hints": hints or ["h1", "h2", "h3"],
        "editorial": editorial,
        "reference_solution": ref_sol,
        "solutions_config": {
            "editorial":  {"gate": "attempts", "attempts_required": 3},
            "reference":  {"gate": "correct"},
            "community":  {"gate": "attempts", "attempts_required": 1},
        },
    })
    return db


def make_valid_token(private_key):
    return make_token(private_key, {"sub": "user_abc", "exp": int(time.time()) + 3600})


@pytest.mark.asyncio
async def test_get_solutions_requires_auth():
    from api.main import app
    client = TestClient(app)
    resp = client.get("/problems/p001_same_same/solutions")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_solutions_returns_locked_for_new_user():
    from api.main import app
    from api.deps import get_db

    private_key, public_key = make_rsa_key_pair()
    token = make_valid_token(private_key)
    mock_db = make_mock_db(attempt_count=0, correct_count=0)

    with patch("api.services.auth._jwks_client") as mock_client:
        mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)
        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)
        resp = client.get(
            "/problems/p001_same_same/solutions",
            headers={"Authorization": f"Bearer {token}"},
        )
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["attempt_count"] == 0
    assert data["editorial"]["locked"] is True
    assert data["reference"]["locked"] is True
    assert data["community"] == []


@pytest.mark.asyncio
async def test_reveal_hint_returns_next_hint():
    from api.main import app
    from api.deps import get_db

    private_key, public_key = make_rsa_key_pair()
    token = make_valid_token(private_key)

    mock_db = MagicMock()
    mock_db.problems.find_one = AsyncMock(return_value={
        "id": 1, "slug": "p001_same_same",
        "hints": ["h1", "h2", "h3"],
        "editorial": None, "reference_solution": None,
        "solutions_config": {},
    })
    mock_db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 0})
    mock_db.hint_reveals.find_one_and_update = AsyncMock(return_value={"revealed_count": 1})
    mock_db.users.find_one = AsyncMock(return_value={"clerk_user_id": "user_abc"})

    with patch("api.services.auth._jwks_client") as mock_client:
        mock_client.get_signing_key_from_jwt.return_value = make_signing_key_mock(public_key)
        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)
        resp = client.post(
            "/problems/p001_same_same/solutions/hints/reveal",
            headers={"Authorization": f"Bearer {token}"},
        )
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["hint"] == "h1"
    assert data["revealed"] == 1
    assert data["total"] == 3
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
pytest tests/test_solutions.py -v -k "test_get_solutions or test_reveal"
```

Expected: fail (router not registered yet).

- [ ] **Step 3: Create `api/routers/solutions.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import SolutionsResponse, HintRevealResponse
from services.auth import verify_clerk_token
import services.problems as problems_svc
import services.solutions as solutions_svc

router = APIRouter(prefix="/problems", tags=["solutions"])


@router.get("/{slug}/solutions", response_model=SolutionsResponse)
async def get_solutions(
    slug: str,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    problem = await problems_svc.get_by_slug(db, slug)
    clerk_user_id = claims["sub"]

    user = await db.users.find_one({"clerk_user_id": clerk_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await solutions_svc.compute_solutions(db, problem, clerk_user_id)
    return SolutionsResponse(**result)


@router.post("/{slug}/solutions/hints/reveal", response_model=HintRevealResponse)
async def reveal_hint(
    slug: str,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    problem = await problems_svc.get_by_slug(db, slug)
    clerk_user_id = claims["sub"]
    hints = problem.get("hints", [])

    new_count = await solutions_svc.increment_hint_reveals(
        db, clerk_user_id, problem["id"], max_count=len(hints)
    )
    if new_count is None:
        raise HTTPException(status_code=400, detail="All hints already revealed")

    return HintRevealResponse(
        hint=hints[new_count - 1],
        revealed=new_count,
        total=len(hints),
    )
```

- [ ] **Step 4: Register the router and add hint_reveals index in `api/main.py`**

Add import alongside existing router imports:
```python
from routers import notebook, problems, submissions, users, webhooks, solutions
```

Add after the existing index creation in the lifespan, before `yield`:
```python
    await db.hint_reveals.create_index(
        [("clerk_user_id", 1), ("problem_id", 1)], unique=True
    )
    logger.info("MongoDB indexes ensured")
    yield
```

Replace the current `logger.info("MongoDB indexes ensured")` + `yield` block — just add the `hint_reveals` index before the existing log line.

Add the router include alongside the others:
```python
app.include_router(solutions.router)
```

- [ ] **Step 5: Run all tests**

```bash
pytest tests/ -v
```

Expected: all tests pass including the 3 new router tests.

- [ ] **Step 6: Commit**

```bash
git add api/routers/solutions.py api/main.py tests/test_solutions.py
git commit -m "feat(solutions): add GET /:slug/solutions and POST /:slug/solutions/hints/reveal endpoints"
```

---

## Task 7: Extension — add types and methods to `api.ts`

**Files:**
- Modify: `vscode-extension/src/api.ts`

- [ ] **Step 1: Add TypeScript interfaces**

Add after the existing `UserSubmission` interface:

```typescript
export interface CommunitySolution {
  rank: number
  handle: string
  timing_ms: number
  char_count: number
  language: string
  code: string
}

export interface EditorialTier {
  locked: boolean
  reason?: string
  content?: string
}

export interface ReferenceTier {
  locked: boolean
  reason?: string
  code?: string
}

export interface SolutionsResponse {
  attempt_count: number
  hints_revealed: number
  hints_total: number
  hints: string[]
  editorial: EditorialTier
  reference: ReferenceTier
  community: CommunitySolution[]
}

export interface HintRevealResult {
  hint: string
  revealed: number
  total: number
}
```

- [ ] **Step 2: Add `authPost` private method to `QLabApi`**

Add after the existing `authGet` method:

```typescript
  private async authPost<T>(path: string): Promise<T | null | 'expired'> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.getToken) {
      const token = await this.getToken()
      if (!token) return 'expired'
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: '{}',
    })
    if (res.status === 401 || res.status === 403) return 'expired'
    if (!res.ok) throw new Error(`API ${path} returned ${res.status}`)
    return res.json() as Promise<T>
  }
```

- [ ] **Step 3: Add `getSolutions` and `revealNextHint` methods**

Add after `getMySubmissions`:

```typescript
  async getSolutions(slug: string): Promise<SolutionsResponse | 'expired'> {
    const result = await this.authGet<SolutionsResponse>(`/problems/${slug}/solutions`)
    return result === null ? 'expired' : result
  }

  async revealNextHint(slug: string): Promise<HintRevealResult | null | 'expired'> {
    return this.authPost<HintRevealResult>(`/problems/${slug}/solutions/hints/reveal`)
  }
```

- [ ] **Step 4: Compile to check for TypeScript errors**

```bash
cd vscode-extension && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add vscode-extension/src/api.ts
git commit -m "feat(ext/api): add SolutionsResponse types and getSolutions/revealNextHint methods"
```

---

## Task 8: Extension — add Solutions tab to `ProblemPanel.ts`

**Files:**
- Modify: `vscode-extension/src/ProblemPanel.ts`

This task has the most changes. Work through each step carefully.

- [ ] **Step 1: Add `getSolutions` and `revealNextHint` message types to `WebviewMessage`**

In `ProblemPanel.ts`, update the `WebviewMessage` interface:

```typescript
interface WebviewMessage {
  type: 'getEditorCode' | 'submit' | 'runTest' | 'refreshLeaderboard' | 'openInEditor' | 'getMySubmissions' | 'getSolutions' | 'revealNextHint'
  target?: string
  code?: string
}
```

- [ ] **Step 2: Add handlers in `_handleMessage`**

Add two new cases to the switch in `_handleMessage`:

```typescript
      case 'getSolutions':
        await this._sendSolutions()
        break

      case 'revealNextHint':
        await this._revealNextHint()
        break
```

- [ ] **Step 3: Add `_sendSolutions` and `_revealNextHint` methods**

Add after `_sendMySubmissions`:

```typescript
  private async _sendSolutions(): Promise<void> {
    const result = await this.api.getSolutions(this.problem.slug).catch(() => null)
    if (result === 'expired') {
      const action = await vscode.window.showWarningMessage(
        'Your qLab session has expired. Please sign in again.',
        'Sign In'
      )
      if (action === 'Sign In') vscode.commands.executeCommand('qlab.signIn')
      this._post({ type: 'solutions', data: null })
      return
    }
    this._post({ type: 'solutions', data: result })
  }

  private async _revealNextHint(): Promise<void> {
    const result = await this.api.revealNextHint(this.problem.slug).catch(() => null)
    if (result === 'expired') {
      const action = await vscode.window.showWarningMessage(
        'Your qLab session has expired. Please sign in again.',
        'Sign In'
      )
      if (action === 'Sign In') vscode.commands.executeCommand('qlab.signIn')
      return
    }
    this._post({ type: 'hintRevealed', data: result })
  }
```

- [ ] **Step 4: Add Solutions tab button in the tab bar HTML**

In `buildHtml`, find the tab bar section and add a sixth tab:

```html
    <button class="tab" data-tab="solutions">Solutions</button>
```

Add this immediately after the `<button class="tab" data-tab="community">Community</button>` line.

- [ ] **Step 5: Add Solutions tab pane HTML**

Add the following pane after the closing `</div>` of the community tab pane, before `</div><!-- /.tab-body -->`:

```html
    <!-- ── SOLUTIONS ──────────────────────────────────────────── -->
    <div class="tab-pane" id="solutions">
      <div id="solutionsContent">
        <p style="color:var(--vscode-descriptionForeground)">Loading…</p>
      </div>
    </div>
```

- [ ] **Step 6: Add Solutions CSS to the `<style>` block**

Add at the end of the `<style>` block, before `</style>`:

```css
    /* ── Solutions sub-tabs ── */
    .sub-tab-bar {
      display: flex;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 12px;
      overflow-x: auto;
    }
    .sub-tab-bar::-webkit-scrollbar { height: 0; }
    .sub-tab {
      padding: 5px 12px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--vscode-tab-inactiveForeground);
      font-family: var(--vscode-font-family);
      font-size: calc(var(--vscode-font-size) - 1px);
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .sub-tab:hover { color: var(--vscode-tab-activeForeground); }
    .sub-tab.active { color: var(--vscode-tab-activeForeground); border-bottom-color: var(--vscode-focusBorder); }
    .sub-pane { display: none; }
    .sub-pane.active { display: block; }

    /* ── Hint cards ── */
    .hint-card {
      border-left: 2px solid var(--vscode-focusBorder);
      background: var(--vscode-textCodeBlock-background);
      padding: 7px 10px;
      margin-bottom: 6px;
      font-size: 0.9em;
      line-height: 1.55;
      border-radius: 0 3px 3px 0;
    }
    .reveal-btn {
      border: 1px dashed var(--vscode-focusBorder);
      padding: 6px 12px;
      color: var(--vscode-focusBorder);
      font-size: 0.85em;
      border-radius: 3px;
      cursor: pointer;
      background: transparent;
      margin-top: 6px;
      width: 100%;
      text-align: center;
    }
    .reveal-btn:hover { background: var(--vscode-list-hoverBackground); }

    /* ── Lock overlay ── */
    .lock-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      gap: 10px;
    }
    .lock-overlay .lock-icon { font-size: 2em; }
    .lock-overlay .lock-title { font-weight: 600; font-size: 1em; }
    .lock-overlay .lock-msg { color: var(--vscode-descriptionForeground); font-size: 0.85em; line-height: 1.6; }
    .sub-lock {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 16px;
      gap: 8px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
    .sub-lock .sub-lock-icon { font-size: 1.6em; }
    .sub-lock .sub-lock-msg { font-size: 0.85em; line-height: 1.6; }
```

- [ ] **Step 7: Add Solutions JavaScript to the `<script>` block**

Add the following JS at the end of the `<script>` block, before the closing `</script>` tag:

```javascript
    // ── Solutions tab ─────────────────────────────────────────
    let solutionsLoaded = false;

    document.querySelector('.tab[data-tab="solutions"]').addEventListener('click', () => {
      if (!solutionsLoaded) {
        solutionsLoaded = true;
        document.getElementById('solutionsContent').innerHTML =
          '<p style="color:var(--vscode-descriptionForeground)"><span class="spinner">⟳</span> Loading…</p>';
        vscode.postMessage({ type: 'getSolutions' });
      }
    });

    function switchSubTab(name) {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active'));
      const tab = document.querySelector(`.sub-tab[data-sub="${name}"]`);
      const pane = document.getElementById('sub-' + name);
      if (tab) tab.classList.add('active');
      if (pane) pane.classList.add('active');
    }

    function renderSolutions(data) {
      const el = document.getElementById('solutionsContent');
      if (!data) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">Sign in to view solutions.</p>';
        return;
      }
      if (data.attempt_count === 0) {
        el.innerHTML =
          '<div class="lock-overlay">' +
          '  <div class="lock-icon">🔒</div>' +
          '  <div class="lock-title">Solutions are locked</div>' +
          '  <div class="lock-msg">Submit at least one attempt to unlock hints.<br>' +
          'Solve the problem to unlock the full editorial and reference solution.</div>' +
          '  <button class="btn-primary" style="margin-top:6px" onclick="switchToSubmit()">Go to Submit →</button>' +
          '</div>';
        return;
      }

      // Build sub-tab bar
      let html =
        '<div class="sub-tab-bar">' +
        '  <button class="sub-tab active" data-sub="hints" onclick="switchSubTab(\'hints\')">Hints</button>' +
        '  <button class="sub-tab" data-sub="editorial" onclick="switchSubTab(\'editorial\')">Editorial</button>' +
        '  <button class="sub-tab" data-sub="reference" onclick="switchSubTab(\'reference\')">Reference</button>' +
        '  <button class="sub-tab" data-sub="community" onclick="switchSubTab(\'community\')">Community</button>' +
        '</div>';

      // Hints pane
      html += '<div class="sub-pane active" id="sub-hints">';
      html += '<p style="font-size:0.78em;color:var(--vscode-descriptionForeground);margin-bottom:8px">' +
              data.hints_revealed + ' of ' + data.hints_total + ' revealed</p>';
      for (const hint of data.hints) {
        html += '<div class="hint-card">💡 ' + e(hint) + '</div>';
      }
      if (data.hints_revealed < data.hints_total) {
        const remaining = data.hints_total - data.hints_revealed;
        html += '<button class="reveal-btn" id="revealBtn" onclick="revealHint()">' +
                '👁 Reveal next hint (' + remaining + ' remaining)</button>';
      } else {
        html += '<p style="font-size:0.82em;color:var(--vscode-descriptionForeground);margin-top:6px">All hints revealed.</p>';
      }
      html += '</div>';

      // Editorial pane
      html += '<div class="sub-pane" id="sub-editorial">';
      if (data.editorial.locked) {
        html += '<div class="sub-lock"><div class="sub-lock-icon">🔒</div>' +
                '<div class="sub-lock-msg">' + e(data.editorial.reason) + '</div></div>';
      } else if (data.editorial.content) {
        // Render markdown as plain text (preserve newlines, code blocks as <pre>)
        html += '<div style="line-height:1.7;font-size:0.9em">' + renderMarkdown(data.editorial.content) + '</div>';
      } else {
        html += '<p style="color:var(--vscode-descriptionForeground)">No editorial yet for this problem.</p>';
      }
      html += '</div>';

      // Reference pane
      html += '<div class="sub-pane" id="sub-reference">';
      if (data.reference.locked) {
        html += '<div class="sub-lock"><div class="sub-lock-icon">🏆</div>' +
                '<div class="sub-lock-msg">' + e(data.reference.reason) + '</div></div>';
      } else if (data.reference.code) {
        html += '<h3>Canonical Solution</h3><pre>' + e(data.reference.code) + '</pre>';
      } else {
        html += '<p style="color:var(--vscode-descriptionForeground)">Reference solution not available.</p>';
      }
      html += '</div>';

      // Community pane
      html += '<div class="sub-pane" id="sub-community">';
      if (!data.community.length) {
        html += '<p style="color:var(--vscode-descriptionForeground)">No community solutions yet — be the first to solve it!</p>';
      } else {
        const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
        for (const sol of data.community) {
          const medal = MEDALS[sol.rank] || '#' + sol.rank;
          html += '<div style="margin-bottom:14px">' +
                  '<div style="font-size:0.82em;color:var(--vscode-descriptionForeground);margin-bottom:4px">' +
                  medal + ' <span class="lb-handle">' + e(sol.handle) + '</span>' +
                  ' · ' + sol.timing_ms + 'ms · ' + sol.char_count + ' chars</div>' +
                  '<pre style="margin:0">' + e(sol.code) + '</pre>' +
                  '</div>';
        }
      }
      html += '</div>';

      el.innerHTML = html;
    }

    function renderMarkdown(md) {
      // Minimal markdown renderer: code blocks, bold, newlines
      return md
        .replace(/```[a-z]*\n?([\s\S]*?)```/g, '<pre>$1</pre>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^## (.*)/gm, '<h3>$1</h3>')
        .replace(/^### (.*)/gm, '<h3 style="font-size:0.85em">$1</h3>')
        .replace(/\n/g, '<br>');
    }

    function revealHint() {
      const btn = document.getElementById('revealBtn');
      if (btn) { btn.disabled = true; btn.textContent = '⟳ Revealing…'; }
      vscode.postMessage({ type: 'revealNextHint' });
    }

    function switchToSubmit() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const submitTab = document.querySelector('.tab[data-tab="submit"]');
      const submitPane = document.getElementById('submit');
      if (submitTab) submitTab.classList.add('active');
      if (submitPane) submitPane.classList.add('active');
    }
```

- [ ] **Step 8: Add message handlers for `solutions` and `hintRevealed` in the `window.addEventListener` switch**

In the existing `window.addEventListener('message', ...)` switch, add two cases after the existing `mySubmissions` case:

```javascript
        case 'solutions': {
          renderSolutions(msg.data);
          break;
        }

        case 'hintRevealed': {
          if (!msg.data) break;
          // Re-fetch solutions to get updated hint list
          solutionsLoaded = false;
          vscode.postMessage({ type: 'getSolutions' });
          break;
        }
```

- [ ] **Step 9: Build and install the extension**

```bash
cd vscode-extension && npm run install-ext 2>&1 | tail -8
```

Expected: `Extension 'qlab-0.1.0.vsix' was successfully installed.`

- [ ] **Step 10: Commit**

```bash
git add vscode-extension/src/ProblemPanel.ts
git commit -m "feat(ext): add Solutions tab with hints/editorial/reference/community sub-tabs"
```

---

## Task 9: Final wiring — restart server and verify end-to-end

- [ ] **Step 1: Run full test suite**

```bash
cd /home/aiyer/qlab && pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 2: Restart the FastAPI server**

```bash
./start.sh
```

Confirm the log shows:
```
INFO: MongoDB indexes ensured
INFO: Application startup complete.
```

- [ ] **Step 3: Smoke-test the solutions endpoint with curl**

Get a token from VS Code (`qlab.signIn` → sign in → token stored in SecretStorage), then:

```bash
TOKEN="<paste token here>"
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/problems/p001_same_same/solutions | python3 -m json.tool
```

Expected: JSON with `attempt_count`, `hints_revealed`, `editorial`, `reference`, `community` keys. Values depend on your submission history.

- [ ] **Step 4: Reload VS Code extension**

Run `Developer: Reload Window` in VS Code command palette. Open a problem panel, click the Solutions tab, and confirm:
- If no attempts: lock overlay with "Go to Submit" button appears
- If 1+ attempts: sub-tabs appear; Hints sub-tab is active; Community shows leaderboard entries
- Clicking "Reveal next hint" shows the next hint

- [ ] **Step 5: Commit final state**

```bash
git add .
git commit -m "feat: Solutions/Editorial tab — full implementation complete"
```
