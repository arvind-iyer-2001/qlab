from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError


async def get_by_clerk_id(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict | None:
    return await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})


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
