from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

_SUMMARY_PROJECTION = {
    "_id": 0,
    "narrative": 0,
    "input_spec": 0,
    "output_spec": 0,
    "examples": 0,
    "hints": 0,
    "winning_criteria": 0,
    "test_call": 0,
    "judge_seed": 0,
    "editorial": 0,
    "reference_solution": 0,
    "solutions_config": 0,
}


async def get_all(db: AsyncIOMotorDatabase) -> list[dict]:
    cursor = db.problems.find({}, _SUMMARY_PROJECTION).sort("id", 1)
    return await cursor.to_list(length=None)


async def get_by_slug(db: AsyncIOMotorDatabase, slug: str) -> dict:
    doc = await db.problems.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Problem '{slug}' not found")
    return doc


async def get_by_id(db: AsyncIOMotorDatabase, problem_id: int) -> dict:
    doc = await db.problems.find_one({"id": problem_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found")
    return doc


async def increment_solve_count(db: AsyncIOMotorDatabase, problem_id: int) -> None:
    await db.problems.update_one({"id": problem_id}, {"$inc": {"solve_count": 1}})


async def upsert_from_json(db: AsyncIOMotorDatabase, data: dict) -> None:
    slug = data["slug"]
    set_fields = {k: v for k, v in data.items() if k != "solve_count"}
    await db.problems.update_one(
        {"slug": slug},
        {
            "$set": set_fields,
            "$setOnInsert": {"solve_count": 0},
        },
        upsert=True,
    )
