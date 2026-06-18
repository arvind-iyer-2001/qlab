#!/usr/bin/env python3
"""
Seed problems from disk into MongoDB.

Run once on deploy (or re-run to pick up new/updated problems):
    MONGODB_URI=... PROBLEMS_DIR=... python3 scripts/seed_problems.py

Idempotent: uses upsert so re-running is safe. Does not reset solve_count.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

# Allow importing api services without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from motor.motor_asyncio import AsyncIOMotorClient
import services.problems as problems_svc

PROBLEMS_DIR = Path(os.getenv("PROBLEMS_DIR", str(Path(__file__).parent.parent / "problems")))
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "qlab")


async def main() -> None:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB]

    print("Creating indexes...")
    await db.problems.create_index("slug", unique=True)
    await db.problems.create_index("id", unique=True)
    await db.submissions.create_index(
        [("problem_id", 1), ("status", 1), ("timing_ms", 1), ("char_count", 1)]
    )
    await db.users.create_index("clerk_user_id", unique=True)
    await db.hint_reveals.create_index(
        [("clerk_user_id", 1), ("problem_id", 1)], unique=True
    )

    print(f"Seeding problems from {PROBLEMS_DIR}...")
    count = 0
    for p in sorted(PROBLEMS_DIR.iterdir()):
        meta_path = p / "problem.json"
        if not p.is_dir() or not meta_path.exists():
            continue
        data = json.loads(meta_path.read_text())
        data["slug"] = p.name
        ref_path = p / "reference.q"
        if ref_path.exists():
            data["reference_solution"] = ref_path.read_text().strip()
        test_gen_path = p / "test_gen.q"
        if test_gen_path.exists():
            data["test_gen_code"] = test_gen_path.read_text().strip()
        await problems_svc.upsert_from_json(db, data)
        print(f"  {p.name}")
        count += 1

    print(f"\nDone — seeded {count} problem(s).")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
