from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Language(str, Enum):
    q = "q"
    k = "k"


class SubmissionStatus(str, Enum):
    pending = "pending"
    running = "running"
    correct = "correct"
    wrong = "wrong"
    error = "error"
    timeout = "timeout"
    invalid = "invalid"


# --- Request models ---

class SubmitRequest(BaseModel):
    problem_id: int
    code: str
    language: Language = Language.q
    handle: str = "anonymous"

    @field_validator("code")
    @classmethod
    def code_must_define_func(cls, v: str) -> str:
        # Strip leading q comment lines (start with /) and blank lines
        lines = v.strip().splitlines()
        code_lines = [l for l in lines if l.strip() and not l.strip().startswith("/")]
        if not code_lines or not code_lines[0].startswith("func:"):
            raise ValueError("Submission must start with 'func:' — define a function named func")
        return "\n".join(code_lines)

    @field_validator("code")
    @classmethod
    def code_must_be_single_param(cls, v: str) -> str:
        # Reject obvious multi-param definitions like func:{[t;h]
        # A more robust check happens in the judge itself
        import re
        if re.search(r"func:\{s*\[[a-zA-Z_]+\s*;", v):
            raise ValueError(
                "func must take a single parameter — use func:{[x]...} not func:{[t;h]...}"
            )
        return v


# --- Response models ---

class ProblemSummary(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: Difficulty
    concepts: list[str]
    posted_date: str
    solve_count: int


class Example(BaseModel):
    input: str
    output: str
    note: Optional[str] = None


class ProblemDetail(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: Difficulty
    concepts: list[str]
    narrative: str
    input_spec: str
    output_spec: str
    examples: list[Example]
    hints: list[str]
    posted_date: str
    winning_criteria: str
    test_call: str       # how to call func for testing, shown to users


class JudgeResult(BaseModel):
    status: SubmissionStatus
    timing_ms: Optional[int] = None
    char_count: Optional[int] = None
    error: Optional[str] = None
    failing_input: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None


class SubmissionResponse(BaseModel):
    submission_id: Optional[int] = None
    problem_id: int
    status: SubmissionStatus
    timing_ms: Optional[int] = None
    char_count: Optional[int] = None
    leaderboard_rank: Optional[int] = None
    error: Optional[str] = None
    failing_input: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None


class LeaderboardEntry(BaseModel):
    rank: int
    handle: str
    timing_ms: int
    char_count: int
    language: Language
    submitted_at: str
