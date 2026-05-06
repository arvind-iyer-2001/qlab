import logging

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import MySubmissionEntry, SubmitRequest, SubmissionResponse, SubmissionStatus
from services.judge import run_judge
from services.auth import verify_clerk_token
import services.problems as problems_svc
import services.submissions as submissions_svc
import services.users as users_svc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse)
async def submit(
    req: SubmitRequest,
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]

    # Resolve handle from stored user profile
    user = await users_svc.get_by_clerk_id(db, user_id)
    handle = (user.get("nickname") or user.get("display_name") or user_id) if user else user_id

    doc = await problems_svc.get_by_id(db, req.problem_id)

    result = await run_judge(
        user_code=req.code,
        problem_id=doc["slug"],
        seed=doc.get("judge_seed", 42),
    )

    submission_id = None
    try:
        submission_id = await submissions_svc.insert(
            db=db,
            problem_id=req.problem_id,
            user_id=user_id,
            handle=handle,
            language=req.language.value,
            code=req.code,
            char_count=result.char_count,
            status=result.status.value,
            timing_ms=result.timing_ms,
            error_msg=result.error or "",
        )
        if result.status == SubmissionStatus.correct:
            await problems_svc.increment_solve_count(db, req.problem_id)
    except Exception as e:
        logger.warning("db write failed: %s", e)

    rank = None
    if result.status == SubmissionStatus.correct and result.timing_ms is not None:
        try:
            lb = await submissions_svc.get_leaderboard(db, req.problem_id, limit=1000)
            rank = sum(
                1 for e in lb
                if e["timing_ms"] < result.timing_ms
                or (e["timing_ms"] == result.timing_ms and e["char_count"] < result.char_count)
            ) + 1
        except Exception as e:
            logger.warning("leaderboard rank failed: %s", e)

    return SubmissionResponse(
        submission_id=submission_id,
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


@router.get("/me", response_model=list[MySubmissionEntry])
async def get_my_submissions(
    problem_id: int = Query(...),
    claims: dict = Depends(verify_clerk_token),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user_id = claims["sub"]
    return await submissions_svc.get_for_user(db, user_id, problem_id)
