import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Make "app" importable wherever the server is started from (local, Vercel).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI

from app.auth.router import router as auth_router
from app.database import create_db_and_tables
from app.reports.router import router as reports_router
from app.stats.router import router as stats_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        create_db_and_tables()
    except Exception as exc:  # keep /api/health and /api/docs alive so a database problem is visible
        print(f"WARNING: could not prepare the database: {exc}")
    yield


app = FastAPI(
    title="Dengue Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(stats_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "FastAPI backend is running"}
