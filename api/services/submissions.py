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
    # One row per user: each user's best correct submission ranked by
    # (timing_ms, char_count). Anonymous rows (no user_id) keep distinct
    # group keys so they aren't collapsed into a single "anonymous" entry.
    pipeline = [
        {"$match": {"problem_id": problem_id, "status": "correct"}},
        {"$sort": {"timing_ms": 1, "char_count": 1}},
        {"$group": {
            "_id": {"$ifNull": ["$user_id", {"$concat": ["anon:", {"$toString": "$_id"}]}]},
            "handle": {"$first": "$handle"},
            "timing_ms": {"$first": "$timing_ms"},
            "char_count": {"$first": "$char_count"},
            "language": {"$first": "$language"},
            "submitted_at": {"$first": "$submitted_at"},
        }},
        {"$sort": {"timing_ms": 1, "char_count": 1}},
        {"$limit": limit},
    ]
    rows = await db.submissions.aggregate(pipeline).to_list(length=limit)
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


async def get_user_ranks(
    db: AsyncIOMotorDatabase, user_id: str
) -> dict[int, int]:
    """For each problem the user has solved, return their current rank.

    Rank = 1 + (count of distinct other users whose best (timing_ms, char_count)
    on that problem beats this user's best).
    """
    # User's best per problem
    user_best_pipeline = [
        {"$match": {"user_id": user_id, "status": "correct"}},
        {"$sort": {"timing_ms": 1, "char_count": 1}},
        {"$group": {
            "_id": "$problem_id",
            "timing_ms": {"$first": "$timing_ms"},
            "char_count": {"$first": "$char_count"},
        }},
    ]
    user_rows = await db.submissions.aggregate(user_best_pipeline).to_list(length=None)
    if not user_rows:
        return {}

    ranks: dict[int, int] = {}
    for row in user_rows:
        problem_id = row["_id"]
        u_t = row["timing_ms"]
        u_c = row["char_count"]
        if u_t is None or u_c is None:
            continue
        # Count other users with strictly better best
        better_pipeline = [
            {"$match": {
                "problem_id": problem_id,
                "status": "correct",
                "user_id": {"$ne": user_id, "$ne": None},
            }},
            {"$sort": {"timing_ms": 1, "char_count": 1}},
            {"$group": {
                "_id": "$user_id",
                "timing_ms": {"$first": "$timing_ms"},
                "char_count": {"$first": "$char_count"},
            }},
            {"$match": {
                "$expr": {
                    "$or": [
                        {"$lt": ["$timing_ms", u_t]},
                        {"$and": [
                            {"$eq": ["$timing_ms", u_t]},
                            {"$lt": ["$char_count", u_c]},
                        ]},
                    ]
                }
            }},
            {"$count": "n"},
        ]
        agg = await db.submissions.aggregate(better_pipeline).to_list(length=1)
        better = agg[0]["n"] if agg else 0
        ranks[problem_id] = better + 1
    return ranks


async def get_for_user(
    db: AsyncIOMotorDatabase,
    user_id: str,
    problem_id: int | None = None,
) -> list[dict]:
    query: dict = {"user_id": user_id}
    if problem_id is not None:
        query["problem_id"] = problem_id
    cursor = (
        db.submissions.find(
            query,
            {
                "_id": 0,
                "problem_id": 1,
                "handle": 1,
                "status": 1,
                "timing_ms": 1,
                "char_count": 1,
                "language": 1,
                "submitted_at": 1,
                "code": 1,
            },
        )
        .sort("submitted_at", -1)
        .limit(100)
    )
    rows = await cursor.to_list(length=100)

    # Best correct submission per problem (lowest timing_ms, then char_count)
    best_idx_by_problem: dict[int, int] = {}
    best_by_problem: dict[int, tuple[int, int]] = {}
    for i, r in enumerate(rows):
        if r.get("status") != "correct":
            continue
        t = r.get("timing_ms")
        c = r.get("char_count")
        if t is None or c is None:
            continue
        pid = r["problem_id"]
        cur = best_by_problem.get(pid)
        if cur is None or (t, c) < cur:
            best_by_problem[pid] = (t, c)
            best_idx_by_problem[pid] = i

    for i, r in enumerate(rows):
        r["is_best"] = (i == best_idx_by_problem.get(r["problem_id"]))
        if isinstance(r.get("submitted_at"), datetime):
            r["submitted_at"] = r["submitted_at"].isoformat()
    return rows
