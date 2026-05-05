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
