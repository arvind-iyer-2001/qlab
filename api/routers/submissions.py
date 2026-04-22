import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models import SubmitRequest, SubmissionResponse, SubmissionStatus
from services.judge import run_judge
from services import db

router = APIRouter(prefix="/submissions", tags=["submissions"])

PROBLEMS_DIR = Path(os.getenv("PROBLEMS_DIR", "/problems"))


def _get_problem_meta(problem_id: int) -> dict:
    for p in PROBLEMS_DIR.iterdir():
        meta_path = p / "problem.json"
        if not meta_path.exists():
            continue
        data = json.loads(meta_path.read_text())
        if data["id"] == problem_id:
            return data, p.name
    raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found")


@router.post("", response_model=SubmissionResponse)
async def submit(req: SubmitRequest):
    """
    Submit a func definition for judging.

    The judge will:
    1. Validate it's a single-param func
    2. Run it against generated test cases
    3. Compare to reference outputs
    4. Time it if correct (timing_ms, char_count)
    5. Persist to kdb+ and return leaderboard rank
    """
    meta, problem_dir_name = _get_problem_meta(req.problem_id)

    result = await run_judge(
        user_code=req.code,
        problem_id=problem_dir_name,
        seed=meta.get("judge_seed", 42),
    )

    # Persist to kdb+
    try:
        await db.insert_submission(
            problem_id=req.problem_id,
            user_id=0,
            handle=req.handle,
            language=req.language.value,
            code=req.code,
            char_count=result.char_count,
            status=result.status.value,
            timing_ms=result.timing_ms,
            error_msg=result.error or "",
        )
    except Exception as e:
        # Non-fatal: judge result still returned, just not persisted
        print(f"[warn] kdb+ insert failed: {e}")

    # Compute leaderboard rank for correct submissions
    rank = None
    if result.status == SubmissionStatus.correct and result.timing_ms is not None:
        try:
            lb = await db.get_leaderboard(req.problem_id, limit=1000)
            rank = next(
                (e["rank"] for e in lb
                 if e["timing_ms"] > result.timing_ms
                 or (e["timing_ms"] == result.timing_ms and e["char_count"] >= result.char_count)),
                len(lb)
            )
            # rank = position of this submission (1-indexed)
            rank = sum(
                1 for e in lb
                if e["timing_ms"] < result.timing_ms
                or (e["timing_ms"] == result.timing_ms and e["char_count"] < result.char_count)
            ) + 1
        except Exception as e:
            print(f"[warn] leaderboard rank failed: {e}")

    return SubmissionResponse(
        problem_id=req.problem_id,
        status=result.status,
        timing_ms=result.timing_ms,
        char_count=result.char_count,
        leaderboard_rank=rank,
        error=result.error,
        failing_input=result.failing_input,
        expected_output=result.expected_output,
        actual_output=result.actual_output,
    )
