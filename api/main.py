from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import notebook, problems, submissions

app = FastAPI(
    title="qLab",
    description="Competitive coding platform for kdb+/q developers",
    version="0.1.0",
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


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
