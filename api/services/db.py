"""
kdb+ async IPC client using pykx AsyncQConnection.

pykx's embedded q engine cannot open sockets off the main thread.
FastAPI runs sync route handlers in a threadpool, which triggers this.
Fix: use AsyncQConnection and async def routes throughout.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pykx as kx

DB_HOST = os.getenv("QLAB_DB_HOST", "localhost")
DB_PORT = int(os.getenv("QLAB_DB_PORT", "5000"))


@asynccontextmanager
async def _conn():
    async with kx.AsyncQConnection(host=DB_HOST, port=DB_PORT) as q:
        yield q


async def insert_submission(
    problem_id: int,
    user_id: int,
    handle: str,
    language: str,
    code: str,
    char_count: int | None,
    status: str,
    timing_ms: int | None,
    error_msg: str,
) -> int:
    """Insert a submission record, return the new id."""
    async with _conn() as q:
        sub_id = await q(
            ".db.insertSubmission",
            kx.Dictionary({
                "problem_id":  kx.LongAtom(problem_id),
                "user_id":     kx.LongAtom(user_id),
                "handle":      kx.SymbolAtom(handle or "anonymous"),
                "language":    kx.SymbolAtom(language),
                "code":        kx.SymbolAtom(code[:2000]),
                "char_count":  kx.LongAtom(char_count if char_count is not None else 0),
                "status":      kx.SymbolAtom(status),
                "timing_ms":   kx.LongAtom(timing_ms if timing_ms is not None else 0),
                "submitted_at": kx.TimestampAtom(datetime.now(timezone.utc)),
                "error_msg":   kx.SymbolAtom(error_msg[:500] if error_msg else ""),
            })
        )
        return int(sub_id)


async def get_leaderboard(problem_id: int, limit: int = 25) -> list[dict]:
    """Top correct submissions for a problem, ranked by timing_ms then char_count."""
    async with _conn() as q:
        table = await q(".db.leaderboard", kx.LongAtom(problem_id), kx.LongAtom(limit))
        rows = table.pd()
        if rows.empty:
            return []
        results = []
        for rank, (_, row) in enumerate(rows.iterrows(), start=1):
            results.append({
                "rank": rank,
                "handle": str(row.get("handle", "anonymous")),
                "timing_ms": int(row.get("timing_ms", 0)),
                "char_count": int(row.get("char_count", 0)),
                "language": str(row.get("language", "q")),
                "submitted_at": str(row.get("submitted_at", "")),
            })
        return results


async def get_solve_count(problem_id: int) -> int:
    """Count correct submissions for a problem."""
    async with _conn() as q:
        return int(await q(".db.solveCount", kx.LongAtom(problem_id)))
