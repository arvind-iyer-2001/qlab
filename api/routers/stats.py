from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from deps import get_db

router = APIRouter(tags=["stats"])


@router.get("/submissions/recent")
async def get_recent_submissions(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    """Most recent correct submissions joined with problem title + difficulty."""
    pipeline = [
        {"$match": {"status": "correct"}},
        {"$sort": {"submitted_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "problems",
            "localField": "problem_id",
            "foreignField": "id",
            "as": "problem",
        }},
        {"$unwind": "$problem"},
        {"$project": {
            "_id": 0,
            "handle": 1,
            "timing_ms": 1,
            "char_count": 1,
            "submitted_at": 1,
            "problem_title": "$problem.title",
            "problem_slug": "$problem.slug",
            "difficulty": "$problem.difficulty",
        }},
    ]
    rows = await db.submissions.aggregate(pipeline).to_list(length=limit)
    for r in rows:
        if isinstance(r.get("submitted_at"), datetime):
            r["submitted_at"] = r["submitted_at"].isoformat()
    return rows


@router.get("/leaderboard/global")
async def get_global_leaderboard(
    limit: int = Query(5, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[dict]:
    """Top users ranked by (distinct problems solved DESC, best timing ASC)."""
    pipeline = [
        {"$match": {"status": "correct", "user_id": {"$ne": None}}},
        # Best per (user, problem)
        {"$sort": {"timing_ms": 1, "char_count": 1}},
        {"$group": {
            "_id": {"user_id": "$user_id", "problem_id": "$problem_id"},
            "handle": {"$first": "$handle"},
            "timing_ms": {"$first": "$timing_ms"},
        }},
        # Roll up per user: count distinct problems + best timing
        {"$group": {
            "_id": "$_id.user_id",
            "handle": {"$first": "$handle"},
            "solved": {"$sum": 1},
            "best_time_ms": {"$min": "$timing_ms"},
        }},
        {"$sort": {"solved": -1, "best_time_ms": 1}},
        {"$limit": limit},
    ]
    rows = await db.submissions.aggregate(pipeline).to_list(length=limit)
    out = []
    for i, r in enumerate(rows):
        out.append({
            "rank": i + 1,
            "handle": r.get("handle") or "anonymous",
            "best_time_ms": r.get("best_time_ms") or 0,
            "solved": r.get("solved") or 0,
        })
    return out


@router.get("/stats/weekly")
async def get_weekly_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """Correct submissions in the last 7 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    count = await db.submissions.count_documents({
        "status": "correct",
        "submitted_at": {"$gte": cutoff},
    })
    return {"count": count}
