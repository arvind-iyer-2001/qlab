"""Live integration tests for PENDING_TASKS §3 verification targets.

Unlike the other tests (pure unit/mock), these exercise the REAL stack:
  * the actual `qlab-judge` docker sandbox (q runs in-container), and
  * a real MongoDB (Atlas in dev) via the FastAPI ASGI app.

Only the Clerk JWT *signature* check (`verify_clerk_token`) is overridden —
token issuance is Clerk infra, not qlab code. Everything below it (routers,
services, Mongo, docker /execute) is the real thing.

Each test is self-skipping: if docker + the image + a host license (and, for the
HTTP tests, a reachable Mongo) aren't present, it skips rather than fails — so
CI without those externals stays green. Run locally with the stack's .env
present (conftest loads it) to actually exercise them.

Covers:
  3.1  expired/invalid license -> friendly_license_error (judge + /execute paths)
  3.2  /execute multi-statement sequential eval in the sandbox
  3.3  onboarding backend contract the gates depend on (fresh user -> nickname null)
  3.4  DELETE /users/me/license full add -> use -> delete cycle through HTTP
"""
import base64
import os
import subprocess

import pytest

# base64("not-a-license") — decodes to junk so q fails the license check.
BAD_LIC = base64.b64encode(b"not-a-license").decode()


# --- environment probes (run at collection; cheap, cached in module globals) ---

def _docker_image_ready() -> bool:
    img = os.getenv("QLAB_DOCKER_IMAGE", "")
    if not img:
        return False
    try:
        r = subprocess.run(
            ["docker", "image", "inspect", img],
            capture_output=True, timeout=15,
        )
        return r.returncode == 0
    except Exception:
        return False


def _mongo_ready() -> bool:
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        return False
    try:
        from pymongo import MongoClient

        MongoClient(uri, serverSelectionTimeoutMS=3000).admin.command("ping")
        return True
    except Exception:
        return False


DOCKER_OK = _docker_image_ready()
MONGO_OK = _mongo_ready()
LICENSE_OK = bool(os.getenv("QLAB_LICENSE_B64", "").strip())

needs_sandbox = pytest.mark.skipif(
    not (DOCKER_OK and LICENSE_OK),
    reason="needs QLAB_DOCKER_IMAGE built + QLAB_LICENSE_B64 set (live docker sandbox)",
)
needs_stack = pytest.mark.skipif(
    not (DOCKER_OK and MONGO_OK and LICENSE_OK),
    reason="needs docker sandbox + reachable MongoDB + host license (full stack)",
)
needs_mongo = pytest.mark.skipif(
    not MONGO_OK, reason="needs a reachable MongoDB"
)


# --- 3.1  license-expiry remapping -------------------------------------------

@needs_sandbox
async def test_3_1_bad_license_friendly_via_execute():
    from services.runner import run_code
    from services.judge import LICENSE_ERROR_MESSAGE

    r = await run_code("1+1", license_b64=BAD_LIC)
    assert r["ok"] is False
    assert r["error"] == LICENSE_ERROR_MESSAGE


@needs_sandbox
async def test_3_1_bad_license_friendly_via_judge():
    from services.judge import run_judge, LICENSE_ERROR_MESSAGE
    from models import SubmissionStatus

    jr = await run_judge("func:{x+1}", "x:1 2 3", "func:{x+1}", license_b64=BAD_LIC)
    assert jr.status == SubmissionStatus.error
    assert jr.error == LICENSE_ERROR_MESSAGE


@needs_sandbox
async def test_3_1_genuine_error_not_remapped():
    """A real code error (`'type`) must surface as itself, not the license msg."""
    from services.runner import run_code
    from services.judge import LICENSE_ERROR_MESSAGE

    r = await run_code("1+`a")  # valid host license, genuine type error
    assert r["ok"] is False
    assert r["error"] != LICENSE_ERROR_MESSAGE
    assert "type" in r["error"]


# --- 3.2  /execute multi-statement eval --------------------------------------

@needs_sandbox
@pytest.mark.parametrize(
    "code,expected",
    [
        ("a:10\nb:20\nc:a+b\nc*2", "60"),          # 4 statements run sequentially
        ("sq:{x*x}\nsq 7", "49"),                   # def then call across statements
        ("f:{[x]\n x+1\n }\nf 41", "42"),           # multi-line block stays one stmt
    ],
)
async def test_3_2_multistatement_eval(code, expected):
    from services.runner import run_code

    r = await run_code(code)
    assert r["ok"] is True, r
    assert r["output"].strip() == expected, r


@needs_sandbox
async def test_3_2_final_expr_error_surfaces():
    from services.runner import run_code

    r = await run_code("1+`a")
    assert r["ok"] is False
    assert r["error"]


# --- HTTP fixture (real Mongo + ASGI app, JWT signature stubbed) --------------

@pytest.fixture
async def stack():
    """Yield (httpx client, db, sub_holder).

    sub_holder["sub"] is the Clerk user id the stubbed token resolves to; tests
    set a unique one and clean up their own user doc.
    """
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient

    from main import app
    from services.auth import verify_clerk_token

    client = AsyncIOMotorClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=10000)
    db = client[os.environ.get("MONGODB_DB", "qlab")]
    app.state.db = db

    sub_holder = {"sub": "user_test_section3"}
    app.dependency_overrides[verify_clerk_token] = lambda: {
        "sub": sub_holder["sub"], "email": "t@example.com", "name": "Tester",
    }

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as hc:
        yield hc, db, sub_holder

    # restore only our override key; leave any set by other modules alone
    app.dependency_overrides.pop(verify_clerk_token, None)
    client.close()


# --- 3.3  onboarding backend contract ----------------------------------------

@needs_mongo
async def test_3_3_onboarding_nickname_contract(stack):
    """Both onboarding gates branch on `!user.nickname` from GET /users/me.

    Verify the live contract: a fresh user has nickname null (gate -> setup);
    after PATCH it is set (gate releases -> /problems).
    """
    hc, db, sub_holder = stack
    sub_holder["sub"] = "user_test_onboarding_3_3"
    await db.users.delete_one({"clerk_user_id": sub_holder["sub"]})
    try:
        r = await hc.get("/users/me")
        assert r.status_code == 200
        assert r.json().get("nickname") is None  # gate would redirect to /profile/setup

        r = await hc.patch("/users/me/nickname", json={"nickname": "newbie33"})
        assert r.status_code == 200

        r = await hc.get("/users/me")
        assert r.json().get("nickname") == "newbie33"  # gate releases
    finally:
        await db.users.delete_one({"clerk_user_id": sub_holder["sub"]})


# --- 3.4  license add -> use -> delete cycle ---------------------------------

@needs_stack
async def test_3_4_license_cycle(stack):
    hc, db, sub_holder = stack
    host_lic = os.environ["QLAB_LICENSE_B64"]
    sub_holder["sub"] = "user_test_license_cycle_3_4"
    await db.users.delete_one({"clerk_user_id": sub_holder["sub"]})
    try:
        # baseline: no license
        assert (await hc.get("/users/me/license")).json() == {"has_license": False}

        # ADD via PATCH (alongside nickname)
        r = await hc.patch(
            "/users/me/nickname", json={"nickname": "tester34", "license_b64": host_lic}
        )
        assert r.status_code == 200
        assert (await hc.get("/users/me/license")).json() == {"has_license": True}

        # USE: /execute runs in docker with the per-user license
        r = await hc.post("/execute", json={"code": "21+21"})
        body = r.json()
        assert body["ok"] is True and body["output"].strip() == "42", body

        # the per-user license is the one used: a bad one yields the friendly error
        await db.users.update_one(
            {"clerk_user_id": sub_holder["sub"]}, {"$set": {"license_b64": BAD_LIC}}
        )
        body = (await hc.post("/execute", json={"code": "1+1"})).json()
        assert body["ok"] is False and "license" in body["error"].lower(), body
        await db.users.update_one(
            {"clerk_user_id": sub_holder["sub"]}, {"$set": {"license_b64": host_lic}}
        )

        # DELETE unsets it
        assert (await hc.delete("/users/me/license")).json() == {"has_license": False}
        doc = await db.users.find_one({"clerk_user_id": sub_holder["sub"]})
        assert "license_b64" not in doc
        assert (await hc.get("/users/me/license")).json() == {"has_license": False}

        # after delete, /execute falls back to the host license and still runs
        body = (await hc.post("/execute", json={"code": "6*7"})).json()
        assert body["ok"] is True and body["output"].strip() == "42", body
    finally:
        await db.users.delete_one({"clerk_user_id": sub_holder["sub"]})
