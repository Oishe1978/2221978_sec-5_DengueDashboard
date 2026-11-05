from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.cases.router import router as cases_router
from app.database import create_db_and_tables

@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Dengue Dashboard API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}
