from pydantic import BaseModel, field_validator
from typing import Literal, Optional
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
    error_runtime = "error_runtime"
    error_parse = "error_parse"
    timeout = "timeout"
    invalid = "invalid"


# --- Request models ---

class SubmitRequest(BaseModel):
    problem_id: int
    code: str
    language: Language = Language.q

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


class NicknameRequest(BaseModel):
    nickname: str

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nickname cannot be empty")
        if len(v) > 30:
            raise ValueError("Nickname must be 30 characters or fewer")
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
    submission_id: Optional[str] = None
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


class MySubmissionEntry(BaseModel):
    problem_id: int
    handle: str
    status: SubmissionStatus
    timing_ms: Optional[int] = None
    char_count: Optional[int] = None
    language: Language
    submitted_at: str
    is_best: bool
    code: str


class TierConfig(BaseModel):
    gate: Literal["attempts", "correct"]
    attempts_required: Optional[int] = None


class SolutionsConfig(BaseModel):
    editorial: TierConfig = TierConfig(gate="correct")
    reference: TierConfig = TierConfig(gate="correct")
    community: TierConfig = TierConfig(gate="attempts", attempts_required=1)


class EditorialTier(BaseModel):
    locked: bool
    reason: Optional[str] = None
    content: Optional[str] = None


class ReferenceTier(BaseModel):
    locked: bool
    reason: Optional[str] = None
    code: Optional[str] = None


class CommunitySolution(BaseModel):
    rank: int
    handle: str
    timing_ms: int
    char_count: int
    language: Language
    code: str


class SolutionsResponse(BaseModel):
    attempt_count: int
    hints_revealed: int
    hints_total: int
    hints: list[str]
    editorial: EditorialTier
    reference: ReferenceTier
    community: list[CommunitySolution]


class HintRevealResponse(BaseModel):
    hint: str
    revealed: int
    total: int
