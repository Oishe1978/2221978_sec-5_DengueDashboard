

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Fix Python import path for Vercel
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cases import models  # noqa: F401
from app.cases.router import router as cases_router
from app.database import create_db_and_tables


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        create_db_and_tables()
    except Exception as e:
        print(f"Database setup note: {e}")
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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


app = FastAPI(
    title="Dengue Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    lifespan=lifespan,
)
