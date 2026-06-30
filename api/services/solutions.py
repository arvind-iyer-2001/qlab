from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument


def _is_unlocked(gate: str, attempts_required: int | None, attempt_count: int, has_correct: bool) -> tuple[bool, str]:
    # A correct submission always unlocks every tier, regardless of gate.
    if has_correct:
        return True, ""
    if gate == "correct":
        return False, "Solve the problem to unlock"
    required = attempts_required or 1
    remaining = max(0, required - attempt_count)
    if remaining > 0:
        word = "attempt" if remaining == 1 else "attempts"
        return False, f"Submit {remaining} more {word} to unlock"
    return True, ""


async def compute_solutions(
    db: AsyncIOMotorDatabase,
    problem: dict,
    clerk_user_id: str,
) -> dict:
    problem_id = problem["id"]

    attempt_count = await db.submissions.count_documents(
        {"user_id": clerk_user_id, "problem_id": problem_id}
    )
    correct_count = await db.submissions.count_documents(
        {"user_id": clerk_user_id, "problem_id": problem_id, "status": "correct"}
    )
    has_correct = correct_count > 0

    hint_doc = await db.hint_reveals.find_one(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id}
    )
    revealed_count = (hint_doc or {}).get("revealed_count", 0)

    hints = problem.get("hints", [])
    revealed_count = min(revealed_count, len(hints))
    config = problem.get("solutions_config", {})

    def tier(name: str) -> tuple[bool, str]:
        cfg = config.get(name, {})
        return _is_unlocked(
            cfg.get("gate", "correct"),
            cfg.get("attempts_required"),
            attempt_count,
            has_correct,
        )

    ed_ok, ed_reason = tier("editorial")
    editorial = {"locked": False, "content": problem.get("editorial")} if ed_ok else {"locked": True, "reason": ed_reason}

    ref_ok, ref_reason = tier("reference")
    reference = {"locked": False, "code": problem.get("reference_solution")} if ref_ok else {"locked": True, "reason": ref_reason}

    comm_ok, _ = tier("community")
    community = await _get_top_community(db, problem_id) if comm_ok else []

    return {
        "attempt_count": attempt_count,
        "hints_revealed": revealed_count,
        "hints_total": len(hints),
        "hints": hints[:revealed_count],
        "editorial": editorial,
        "reference": reference,
        "community": community,
    }


async def _get_top_community(db: AsyncIOMotorDatabase, problem_id: int, limit: int = 5) -> list[dict]:
    cursor = (
        db.submissions.find(
            {"problem_id": problem_id, "status": "correct"},
            {"_id": 0, "handle": 1, "timing_ms": 1, "char_count": 1, "language": 1, "code": 1},
        )
        .sort([("timing_ms", 1), ("char_count", 1)])
        .limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    return [{"rank": i + 1, **r} for i, r in enumerate(rows)]


async def increment_hint_reveals(
    db: AsyncIOMotorDatabase,
    clerk_user_id: str,
    problem_id: int,
    max_count: int,
) -> int | None:
    current = await db.hint_reveals.find_one(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id}
    )
    current_count = (current or {}).get("revealed_count", 0)
    if current_count >= max_count:
        return None

    doc = await db.hint_reveals.find_one_and_update(
        {"clerk_user_id": clerk_user_id, "problem_id": problem_id},
        {"$inc": {"revealed_count": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["revealed_count"]
