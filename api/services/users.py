from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError


async def get_by_clerk_id(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict | None:
    return await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})


async def get_or_create(db: AsyncIOMotorDatabase, claims: dict) -> dict:
    """Return the user doc, creating a minimal one from JWT claims if missing.

    The Clerk webhook only fires on signup, so a doc that was never synced (or
    was deleted) would otherwise 404 forever. Self-heal from the token instead.
    """
    clerk_user_id = claims["sub"]
    existing = await get_by_clerk_id(db, clerk_user_id)
    if existing:
        return existing
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {
            "$setOnInsert": {
                "clerk_user_id": clerk_user_id,
                "nickname": None,
                "display_name": claims.get("name") or claims.get("full_name") or "",
                "email": claims.get("email") or "",
                "avatar_url": claims.get("picture") or claims.get("image_url"),
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return await get_by_clerk_id(db, clerk_user_id)


async def upsert(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    display_name: str,
    email: str,
    avatar_url: str | None = None,
    username: str | None = None,
) -> None:
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {
            "$set": {
                "display_name": display_name,
                "email": email,
                "avatar_url": avatar_url,
                "username": username,
            },
            "$setOnInsert": {
                "clerk_user_id": clerk_user_id,
                "nickname": None,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )


async def get_stats(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict:
    """Return solve totals + per-difficulty breakdown for a user."""
    pipeline = [
        {"$match": {"user_id": clerk_user_id, "status": "correct"}},
        {"$group": {"_id": "$problem_id"}},
        {"$lookup": {
            "from": "problems",
            "localField": "_id",
            "foreignField": "id",
            "as": "problem",
        }},
        {"$unwind": "$problem"},
        {"$group": {"_id": "$problem.difficulty", "count": {"$sum": 1}}},
    ]
    solved_rows = await db.submissions.aggregate(pipeline).to_list(length=None)
    solved = {"easy": 0, "medium": 0, "hard": 0}
    for r in solved_rows:
        if r["_id"] in solved:
            solved[r["_id"]] = r["count"]

    total_rows = await db.problems.aggregate(
        [{"$group": {"_id": "$difficulty", "count": {"$sum": 1}}}]
    ).to_list(length=None)
    totals = {"easy": 0, "medium": 0, "hard": 0}
    for r in total_rows:
        if r["_id"] in totals:
            totals[r["_id"]] = r["count"]

    return {
        "total_solves": sum(solved.values()),
        "total_problems": sum(totals.values()),
        "by_difficulty": solved,
        "totals_by_difficulty": totals,
    }


async def delete_user(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict:
    """Cascade a user deletion: anonymize, don't destroy competition history.

    The leaderboard reads the `handle` denormalized onto each submission (it
    does not join back to `users`), so deleting the user doc alone would leave
    orphaned handles owned by nobody. Instead we rewrite those handles to
    "[deleted]" and keep the submissions — preserving timing/char rankings and
    solve counts. `hint_reveals` are keyed by clerk_user_id and hold no PII, so
    they're left as-is. Finally the `users` doc is removed.

    Returns a small summary for logging.
    """
    sub_result = await db.submissions.update_many(
        {"user_id": clerk_user_id},
        {"$set": {"handle": "[deleted]"}},
    )
    user_result = await db.users.delete_one({"clerk_user_id": clerk_user_id})
    return {
        "submissions_anonymized": sub_result.modified_count,
        "users_deleted": user_result.deleted_count,
    }


async def set_nickname(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    nickname: str,
) -> None:
    try:
        await db.users.update_one(
            {"clerk_user_id": clerk_user_id},
            {"$set": {"nickname": nickname}},
        )
    except DuplicateKeyError:
        raise ValueError("That nickname is already taken. Please choose another.")
