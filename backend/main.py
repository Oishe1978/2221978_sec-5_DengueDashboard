from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.cases import models  # noqa: F401
from app.cases.router import router as cases_router
from app.database import create_db_and_tables


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        create_db_and_tables()
    except Exception as e:
        print(f"Database setup error (ignored for server stability): {e}")
    yield


app = FastAPI(
    title="Dengue Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/hello")
def root() -> dict[str, str]:
    return {"message": "FastAPI backend is running"}


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
