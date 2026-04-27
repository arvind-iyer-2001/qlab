from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db
from models import LeaderboardEntry, ProblemDetail, ProblemSummary
import services.problems as problems_svc
import services.submissions as submissions_svc

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("", response_model=list[ProblemSummary])
async def list_problems(db: AsyncIOMotorDatabase = Depends(get_db)):
    docs = await problems_svc.get_all(db)
    return [ProblemSummary(**d) for d in docs]


@router.get("/{problem_id}", response_model=ProblemDetail)
async def get_problem(problem_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await problems_svc.get_by_slug(db, problem_id)
    return ProblemDetail(**doc)


@router.get("/{problem_id}/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    problem_id: str,
    limit: int = 25,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await problems_svc.get_by_slug(db, problem_id)
    rows = await submissions_svc.get_leaderboard(db, doc["id"], limit=limit)
    return [LeaderboardEntry(**r) for r in rows]
