from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


async def insert(
    db: AsyncIOMotorDatabase,
    problem_id: int,
    user_id: str | None,
    handle: str,
    language: str,
    code: str,
    char_count: int | None,
    status: str,
    timing_ms: int | None,
    error_msg: str,
) -> str:
    result = await db.submissions.insert_one({
        "problem_id": problem_id,
        "user_id": user_id,
        "handle": handle or "anonymous",
        "language": language,
        "code": code,
        "char_count": char_count,
        "status": status,
        "timing_ms": timing_ms,
        "error_msg": error_msg[:500] if error_msg else "",
        "submitted_at": datetime.now(timezone.utc),
    })
    return str(result.inserted_id)


async def get_leaderboard(
    db: AsyncIOMotorDatabase, problem_id: int, limit: int = 25
) -> list[dict]:
    cursor = (
        db.submissions.find(
            {"problem_id": problem_id, "status": "correct"},
            {"_id": 0, "handle": 1, "timing_ms": 1, "char_count": 1, "language": 1, "submitted_at": 1},
        )
        .sort([("timing_ms", 1), ("char_count", 1)])
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    return [
        {
            "rank": i + 1,
            "handle": r["handle"],
            "timing_ms": r["timing_ms"],
            "char_count": r["char_count"],
            "language": r["language"],
            "submitted_at": (
                r["submitted_at"].isoformat()
                if isinstance(r["submitted_at"], datetime)
                else str(r["submitted_at"])
            ),
        }
        for i, r in enumerate(rows)
    ]
