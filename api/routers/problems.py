import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from models import ProblemDetail, ProblemSummary, LeaderboardEntry
from services import db

router = APIRouter(prefix="/problems", tags=["problems"])

PROBLEMS_DIR = Path(os.getenv("PROBLEMS_DIR", "/problems"))


def _load_problem_json(problem_id: str) -> dict:
    path = PROBLEMS_DIR / problem_id / "problem.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Problem '{problem_id}' not found")
    return json.loads(path.read_text())


@router.get("", response_model=list[ProblemSummary])
async def list_problems():
    """List all available problems."""
    problems = []
    for p in sorted(PROBLEMS_DIR.iterdir()):
        if not p.is_dir():
            continue
        meta_path = p / "problem.json"
        if not meta_path.exists():
            continue
        data = json.loads(meta_path.read_text())
        problems.append(
            ProblemSummary(
                id=data["id"],
                slug=data["slug"],
                title=data["title"],
                difficulty=data["difficulty"],
                concepts=data["concepts"],
                posted_date=data["posted_date"],
                solve_count=data.get("solve_count", 0),
            )
        )
    return problems


@router.get("/{problem_id}", response_model=ProblemDetail)
async def get_problem(problem_id: str):
    """Get full problem detail by slug or numeric ID."""
    # Allow lookup by slug (directory name) or numeric id
    data = _load_problem_json(problem_id)
    return ProblemDetail(**data)


@router.get("/{problem_id}/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(problem_id: str, limit: int = 25):
    """Top submissions for a problem, ranked by timing_ms then char_count."""
    data = _load_problem_json(problem_id)
    rows = await db.get_leaderboard(data["id"], limit=limit)
    return [LeaderboardEntry(**r) for r in rows]
