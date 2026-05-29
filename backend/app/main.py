"""
TeacherPD backend — FastAPI entry point.

Startup sequence:
  1. Create PostgreSQL tables (idempotent).
  2. Load pedagogy documents into ChromaDB (if the collection is empty).
  3. Mount coaching and peer-matching routers.
"""

import logging
import os

import httpx
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import create_tables
from app.routes.assessments import router as teachup_assessments_router
from app.routes.auth import router as teachup_auth_router
from app.routes.chat import router as teachup_chat_router
from app.routes.coaching import router as coaching_router
from app.routes.lessons import router as teachup_lessons_router
from app.routes.pd import router as teachup_pd_router
from app.routes.peers import router as peers_router
from app.routes.profile import router as teachup_profile_router
from app.services.embeddings import get_docs_collection, load_documents_from_dir

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

KNOWLEDGE_BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base")

app = FastAPI(
    title="UpTeach API",
    description="AI-powered professional development coaching and peer matching for teachers.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coaching_router)
app.include_router(peers_router)

# ── UpTeach API (v1) ─────────────────────────────────────────────────────────
app.include_router(teachup_auth_router)
app.include_router(teachup_profile_router)
app.include_router(teachup_chat_router)
app.include_router(teachup_lessons_router)
app.include_router(teachup_assessments_router)
app.include_router(teachup_pd_router)


# ── Global exception handlers ────────────────────────────────────────────────

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "A database error occurred. Please try again later."},
    )


@app.exception_handler(httpx.ConnectError)
async def ollama_connect_handler(request: Request, exc: httpx.ConnectError):
    logger.error("Could not reach Ollama on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "The AI coaching service is currently unavailable. Make sure Ollama is running."},
    )


@app.exception_handler(httpx.HTTPStatusError)
async def ollama_status_handler(request: Request, exc: httpx.HTTPStatusError):
    logger.error("Ollama returned an error on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": f"The AI service returned an error: {exc.response.status_code}"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s", request.url)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup() -> None:
    # 1. Ensure DB tables exist
    create_tables()
    logger.info("[startup] Database tables ready.")

    # 2. Load knowledge-base documents if the collection is empty
    collection = get_docs_collection()
    if collection.count() == 0:
        if os.path.isdir(KNOWLEDGE_BASE_DIR):
            load_documents_from_dir(KNOWLEDGE_BASE_DIR)
        else:
            logger.warning("[startup] Knowledge base dir not found: %s", KNOWLEDGE_BASE_DIR)
    else:
        logger.info("[startup] ChromaDB already has %d document chunks.", collection.count())


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TeacherPD API"}
