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


import pytest
from unittest.mock import AsyncMock, MagicMock


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
    assert result["reference"]["locked"] is True
    assert result["hints"] == ["hint1", "hint2"]


@pytest.mark.asyncio
async def test_correct_submission_unlocks_reference():
    from api.services.solutions import compute_solutions

    db = MagicMock()
    db.submissions.count_documents = AsyncMock(side_effect=[5, 1])
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 3})
    db.submissions.find = MagicMock()
    db.submissions.find.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])

    result = await compute_solutions(db, make_problem(), "user_abc")

    assert result["reference"]["locked"] is False
    assert result["reference"]["code"] == "func:{x}"
    assert result["hints"] == ["hint1", "hint2", "hint3"]


@pytest.mark.asyncio
async def test_increment_hint_reveals_returns_new_count():
    from api.services.solutions import increment_hint_reveals

    db = MagicMock()
    db.hint_reveals.find_one = AsyncMock(return_value={"revealed_count": 1})
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
