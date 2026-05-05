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
