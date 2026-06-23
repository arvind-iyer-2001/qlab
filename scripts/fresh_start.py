#!/usr/bin/env python3
"""
qlab-fresh — reset qlab to a clean demo state.

DESTRUCTIVE. In fixed order:
  1. MongoDB: delete all submissions
  2. MongoDB: delete all hint_reveals
  3. MongoDB: set every problems.solve_count = 0
  4. MongoDB: delete all users
  5. Clerk:   delete all Clerk users (via the `clerk` CLI) unless --skip-clerk

Requires an explicit confirmation (type 'yes') or the --yes flag.

Usage:
  uv run --with motor --with python-dotenv scripts/fresh_start.py
  uv run --with motor --with python-dotenv scripts/fresh_start.py --yes
  uv run --with motor --with python-dotenv scripts/fresh_start.py --skip-clerk
  uv run --with motor --with python-dotenv scripts/fresh_start.py --dry-run

Env:
  MONGODB_URI (default mongodb://localhost:27017), MONGODB_DB (default qlab)
"""
import argparse
import asyncio
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "qlab")


def clerk_delete_all(dry: bool) -> None:
    if not shutil.which("clerk"):
        print("  ! `clerk` CLI not found on PATH — skipping Clerk deletion.")
        print("    Install/login, then re-run, or delete users in the Clerk dashboard.")
        return
    # List user IDs as JSON, then delete each.
    try:
        out = subprocess.run(
            ["clerk", "users", "list", "--output", "json"],
            capture_output=True, text=True, check=True,
        ).stdout
        users = json.loads(out or "[]")
    except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
        print(f"  ! could not list Clerk users ({e}); skipping. Check `clerk` auth.")
        return
    ids = [u.get("id") for u in users if isinstance(u, dict) and u.get("id")]
    print(f"  Clerk users found: {len(ids)}")
    for uid in ids:
        if dry:
            print(f"    [dry-run] would delete {uid}")
            continue
        r = subprocess.run(["clerk", "users", "delete", uid], capture_output=True, text=True)
        print(f"    deleted {uid}" if r.returncode == 0 else f"    FAILED {uid}: {r.stderr.strip()}")


async def main() -> int:
    ap = argparse.ArgumentParser(description="Reset qlab to a clean demo state (destructive).")
    ap.add_argument("--yes", action="store_true", help="skip the interactive confirmation")
    ap.add_argument("--skip-clerk", action="store_true", help="do not touch Clerk users")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen, change nothing")
    args = ap.parse_args()

    from motor.motor_asyncio import AsyncIOMotorClient

    db = AsyncIOMotorClient(MONGODB_URI)[MONGODB_DB]

    subs = await db.submissions.count_documents({})
    hints = await db.hint_reveals.count_documents({})
    users = await db.users.count_documents({})
    probs = await db.problems.count_documents({})
    print(f"Target: {MONGODB_URI} / {MONGODB_DB}")
    print(f"  submissions={subs}  hint_reveals={hints}  users={users}  problems={probs}")
    print(f"  Clerk: {'SKIPPED' if args.skip_clerk else 'will delete all users'}")

    if args.dry_run:
        print("\n[dry-run] no changes made.")
        if not args.skip_clerk:
            clerk_delete_all(dry=True)
        return 0

    if not args.yes:
        if input("\nType 'yes' to wipe the above and reset solve counts: ").strip() != "yes":
            print("Aborted.")
            return 1

    r1 = await db.submissions.delete_many({})
    print(f"  deleted {r1.deleted_count} submissions")
    r2 = await db.hint_reveals.delete_many({})
    print(f"  deleted {r2.deleted_count} hint_reveals")
    r3 = await db.problems.update_many({}, {"$set": {"solve_count": 0}})
    print(f"  reset solve_count on {r3.modified_count} problems")
    r4 = await db.users.delete_many({})
    print(f"  deleted {r4.deleted_count} users")

    if not args.skip_clerk:
        print("Clerk:")
        clerk_delete_all(dry=False)

    print("\n✅ fresh start complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
