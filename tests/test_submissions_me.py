from datetime import datetime, timezone

import pytest

from api.models import MySubmissionEntry
from api.services.submissions import get_for_user


class _AsyncCursor:
    def __init__(self, rows):
        self._rows = rows
        self.projection = None

    def sort(self, *_a, **_kw):
        return self

    def limit(self, *_a, **_kw):
        return self

    async def to_list(self, length=None):
        return list(self._rows)


class _SubmissionsCollection:
    def __init__(self, rows):
        self.cursor = _AsyncCursor(rows)
        self.query = None
        self.projection = None

    def find(self, query, projection):
        self.query = query
        self.projection = projection
        self.cursor.projection = projection
        return self.cursor


class _Db:
    def __init__(self, rows):
        self.submissions = _SubmissionsCollection(rows)


@pytest.mark.asyncio
async def test_get_for_user_includes_code_for_response_model():
    db = _Db([
        {
            "problem_id": 1,
            "handle": "tester",
            "status": "correct",
            "timing_ms": 5,
            "char_count": 42,
            "language": "q",
            "submitted_at": datetime.now(timezone.utc),
            "code": "func:{x*2}",
        }
    ])

    rows = await get_for_user(db, "user_abc", 1)
    serialized = MySubmissionEntry(**rows[0]).model_dump()

    assert db.submissions.projection["code"] == 1
    assert serialized["code"] == "func:{x*2}"
