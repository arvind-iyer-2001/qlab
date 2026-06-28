import logging
import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

from routers import problems, stats, submissions, users, webhooks, solutions, execute
from services.license import is_valid_b64
from services.logging_config import RequestContextMiddleware, configure_logging

configure_logging()
logger = logging.getLogger("qlab.startup")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "qlab")


def check_host_license() -> None:
    """Warn (not fatal) about the host fallback license at startup.

    Per-user licenses still work without it, so a missing/invalid
    QLAB_LICENSE_B64 only degrades the host fallback — log, don't exit.
    """
    raw = os.getenv("QLAB_LICENSE_B64", "")
    if not raw or not raw.strip():
        logger.warning(
            "QLAB_LICENSE_B64 not set — host fallback license empty; "
            "only per-user licenses will work"
        )
    elif not is_valid_b64(raw):
        logger.warning(
            "QLAB_LICENSE_B64 is set but not valid base64 — host fallback will fail"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to MongoDB (%s)…", MONGODB_DB)
    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=10_000)
    try:
        await client.admin.command("ping")
        logger.info("MongoDB connection OK")
    except Exception as exc:
        logger.error("MongoDB connection failed: %s", exc)
        logger.error(
            "Common causes: IP not on Atlas allowlist, wrong URI, or network issue. "
            "Check MONGODB_URI in .env and add your IP at cloud.mongodb.com → Network Access."
        )
        client.close()
        sys.exit(1)
    app.state.mongo_client = client
    db = client[MONGODB_DB]
    app.state.db = db
    await db.users.create_index("clerk_user_id", unique=True)
    # nickname must be unique only among users who have actually set one. A
    # plain unique+sparse index still indexes explicit null values, so the 2nd
    # user inserted with nickname=None collides. A partial index over string
    # nicknames indexes only real handles, leaving unset users unconstrained.
    try:
        await db.users.drop_index("nickname_1")
    except OperationFailure:
        pass  # no pre-existing index to replace
    await db.users.create_index(
        "nickname",
        name="nickname_1",
        unique=True,
        partialFilterExpression={"nickname": {"$type": "string"}},
    )
    await db.submissions.create_index([("user_id", 1), ("problem_id", 1)])
    await db.submissions.create_index([("problem_id", 1), ("status", 1), ("timing_ms", 1), ("char_count", 1)])
    await db.hint_reveals.create_index(
        [("clerk_user_id", 1), ("problem_id", 1)], unique=True
    )
    logger.info("MongoDB indexes ensured")
    check_host_license()
    yield
    client.close()


app = FastAPI(
    title="qLab",
    description="Competitive coding platform for kdb+/q developers",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)
# Added last so it runs outermost — request IDs cover CORS + every handler.
app.add_middleware(RequestContextMiddleware)

app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(execute.router)
app.include_router(users.router)
app.include_router(webhooks.router)
app.include_router(solutions.router)
app.include_router(stats.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
