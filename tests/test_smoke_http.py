"""In-process HTTP smoke test — no Clerk token, no Mongo, no docker.

Uses FastAPI's TestClient with dependency overrides so CI can guard the wiring
of the key routes (health, auth gating, an auth-protected handler) without any
external services. The client is NOT used as a context manager, so the Mongo-
connecting lifespan never runs.
"""

from fastapi.testclient import TestClient

from api.main import app
# Import the dependency callables by the SAME (flat) module path the routers
# use — `from deps import get_db`, `from services.auth import ...` — so the
# override keys match the objects the routes actually depend on.
from deps import get_db
from services.auth import verify_clerk_token


class _Users:
    def __init__(self, doc):
        self._doc = doc

    async def find_one(self, query, projection=None):
        return self._doc

    async def update_one(self, *_a, **_kw):
        return None


class _StubDB:
    def __init__(self, user_doc):
        self.users = _Users(user_doc)


def _fake_claims():
    return {"sub": "user_test", "email": "t@example.com", "name": "Tester"}


def test_health_ok():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_protected_route_401_without_token():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/users/me")
    assert resp.status_code == 401


def test_protected_route_200_with_override():
    user_doc = {
        "clerk_user_id": "user_test",
        "nickname": "tester",
        "display_name": "Tester",
        "email": "t@example.com",
        "avatar_url": None,
    }
    app.dependency_overrides[verify_clerk_token] = _fake_claims
    app.dependency_overrides[get_db] = lambda: _StubDB(user_doc)
    try:
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.get("/users/me")
        assert resp.status_code == 200, resp.text
        assert resp.json()["nickname"] == "tester"
    finally:
        app.dependency_overrides.clear()
