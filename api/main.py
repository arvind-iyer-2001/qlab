import logging
import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from routers import notebook, problems, stats, submissions, users, webhooks, solutions

logger = logging.getLogger("qlab.startup")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "qlab")


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
    await db.users.create_index("nickname", unique=True, sparse=True)
    await db.submissions.create_index([("user_id", 1), ("problem_id", 1)])
    await db.submissions.create_index([("problem_id", 1), ("status", 1), ("timing_ms", 1), ("char_count", 1)])
    await db.hint_reveals.create_index(
        [("clerk_user_id", 1), ("problem_id", 1)], unique=True
    )
    logger.info("MongoDB indexes ensured")
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

app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(notebook.router)
app.include_router(users.router)
app.include_router(webhooks.router)
app.include_router(solutions.router)
app.include_router(stats.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
