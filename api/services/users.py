from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase


async def get_by_clerk_id(db: AsyncIOMotorDatabase, clerk_user_id: str) -> dict | None:
    return await db.users.find_one({"clerk_user_id": clerk_user_id}, {"_id": 0})


async def upsert(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    display_name: str,
    email: str,
) -> None:
    await db.users.update_one(
        {"clerk_user_id": clerk_user_id},
        {
            "$set": {"display_name": display_name, "email": email},
            "$setOnInsert": {
                "clerk_user_id": clerk_user_id,
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )
