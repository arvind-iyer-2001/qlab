import pytest

from api.services.users import delete_user


class _UpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class _DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class _Submissions:
    """In-memory submissions with update_many semantics for handle rewrite."""

    def __init__(self, rows):
        self.rows = rows

    async def update_many(self, query, update):
        uid = query["user_id"]
        new_handle = update["$set"]["handle"]
        n = 0
        for r in self.rows:
            if r["user_id"] == uid:
                r["handle"] = new_handle
                n += 1
        return _UpdateResult(n)


class _Users:
    def __init__(self, docs):
        self.docs = docs

    async def delete_one(self, query):
        uid = query["clerk_user_id"]
        before = len(self.docs)
        self.docs[:] = [d for d in self.docs if d["clerk_user_id"] != uid]
        return _DeleteResult(before - len(self.docs))


class _HintReveals:
    def __init__(self, rows):
        self.rows = rows


class _Db:
    def __init__(self, subs, users, hints):
        self.submissions = _Submissions(subs)
        self.users = _Users(users)
        self.hint_reveals = _HintReveals(hints)


@pytest.mark.asyncio
async def test_delete_user_anonymizes_submissions_and_keeps_them():
    subs = [
        {"user_id": "u1", "handle": "alice", "problem_id": 1, "timing_ms": 5},
        {"user_id": "u1", "handle": "alice", "problem_id": 2, "timing_ms": 9},
        {"user_id": "u2", "handle": "bob", "problem_id": 1, "timing_ms": 4},
    ]
    users = [{"clerk_user_id": "u1"}, {"clerk_user_id": "u2"}]
    hints = [{"clerk_user_id": "u1", "problem_id": 1}]
    db = _Db(subs, users, hints)

    result = await delete_user(db, "u1")

    # Both of u1's submissions survive, handle rewritten to [deleted].
    u1_subs = [s for s in subs if s["user_id"] == "u1"]
    assert len(u1_subs) == 2
    assert all(s["handle"] == "[deleted]" for s in u1_subs)
    # u2 untouched.
    assert [s for s in subs if s["user_id"] == "u2"][0]["handle"] == "bob"
    # user doc removed, hint_reveals left as-is (no PII).
    assert {d["clerk_user_id"] for d in users} == {"u2"}
    assert len(db.hint_reveals.rows) == 1

    assert result == {"submissions_anonymized": 2, "users_deleted": 1}


@pytest.mark.asyncio
async def test_delete_user_with_no_submissions():
    db = _Db([], [{"clerk_user_id": "u9"}], [])
    result = await delete_user(db, "u9")
    assert result == {"submissions_anonymized": 0, "users_deleted": 1}
