"""
Coaching routes.

POST /teachers          — onboard a new teacher
GET  /teachers/{id}     — fetch a teacher's profile
POST /reflect           — submit a reflection message, get AI coaching response
GET  /sessions/{id}     — retrieve session history for a teacher
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import CoachingSession, Teacher, get_db
from app.services.embeddings import upsert_teacher_profile
from app.services.rag import build_teacher_context, classify_theme, get_coaching_response
from models.schemas import ReflectRequest, ReflectResponse, SessionOut, TeacherCreate, TeacherOut

logger = logging.getLogger(__name__)
router = APIRouter(tags=["coaching"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_teacher_or_404(teacher_id: int, db: Session) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id={teacher_id} not found.",
        )
    return teacher


def _embedding_metadata(teacher: Teacher) -> dict:
    """Build the metadata dict stored alongside the teacher's ChromaDB embedding."""
    return {
        "name": teacher.name,
        "school": teacher.school or "",
        "school_type": teacher.school_type or "",
        "school_location": teacher.school_location or "",
        "state": teacher.state or "",
        "district": teacher.district or "",
        "instruction_language": teacher.instruction_language or "",
        "coaching_language": teacher.coaching_language or "English",
    }


# ── Teacher onboarding ───────────────────────────────────────────────────────

@router.post("/teachers", response_model=TeacherOut, status_code=201)
def create_teacher(payload: TeacherCreate, db: Session = Depends(get_db)):
    """Register a new teacher and initialise their profile embedding."""
    teacher = Teacher(**payload.model_dump())
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    upsert_teacher_profile(
        teacher_id=teacher.id,
        grade=teacher.grades_taught,
        subject=teacher.subjects_taught,
        themes=[],
        metadata=_embedding_metadata(teacher),
    )
    return teacher


@router.get("/teachers/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    return _get_teacher_or_404(teacher_id, db)


# ── Reflection / coaching ────────────────────────────────────────────────────

@router.post("/reflect", response_model=ReflectResponse)
def reflect(payload: ReflectRequest, db: Session = Depends(get_db)):
    """
    Accept a teacher's reflection message and return an AI coaching response.

    Steps:
    1. Validate teacher exists.
    2. Build a one-sentence teacher context string from their profile.
    3. Pull last 5 sessions for conversational context.
    4. Run RAG pipeline (context + history + teacher profile) → coaching response.
    5. Classify the message theme.
    6. Persist the new session.
    7. Refresh the teacher's profile embedding with updated themes.
    8. Return the response.
    """
    teacher = _get_teacher_or_404(payload.teacher_id, db)

    # Build profile context sentence for the prompt
    teacher_context = build_teacher_context(teacher)

    # Fetch recent session history (oldest first for prompt ordering)
    recent_sessions = (
        db.query(CoachingSession)
        .filter(CoachingSession.teacher_id == payload.teacher_id)
        .order_by(CoachingSession.timestamp.desc())
        .limit(5)
        .all()
    )
    history = [
        {"message": s.message, "ai_response": s.ai_response}
        for s in reversed(recent_sessions)
    ]

    # RAG + LLM — surface a clean error if Ollama is unreachable
    try:
        ai_response = get_coaching_response(
            teacher_message=payload.message,
            session_history=history,
            teacher_context=teacher_context,
        )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        logger.error("Ollama unreachable during /reflect: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI coaching service is currently unavailable. Make sure Ollama is running.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Ollama returned HTTP %s during /reflect", exc.response.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The AI service returned an error (HTTP {exc.response.status_code}).",
        )

    # Theme classification — fall back to "other" on any LLM error
    try:
        theme = classify_theme(payload.message)
    except Exception as exc:
        logger.warning("Theme classification failed, defaulting to 'other': %s", exc)
        theme = "other"

    # Persist session
    session = CoachingSession(
        teacher_id=payload.teacher_id,
        message=payload.message,
        ai_response=ai_response,
        theme=theme,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Refresh profile embedding with all accumulated themes
    all_themes = (
        db.query(CoachingSession.theme)
        .filter(
            CoachingSession.teacher_id == payload.teacher_id,
            CoachingSession.theme.isnot(None),
        )
        .distinct()
        .all()
    )
    theme_list = [t[0] for t in all_themes if t[0]]
    try:
        upsert_teacher_profile(
            teacher_id=teacher.id,
            grade=teacher.grades_taught,
            subject=teacher.subjects_taught,
            themes=theme_list,
            metadata=_embedding_metadata(teacher),
        )
    except Exception as exc:
        logger.warning("Profile embedding update failed for teacher %d: %s", teacher.id, exc)

    return ReflectResponse(
        teacher_id=payload.teacher_id,
        message=payload.message,
        ai_response=ai_response,
        theme=theme,
        session_id=session.id,
    )


# ── Session history ──────────────────────────────────────────────────────────

@router.get("/sessions/{teacher_id}", response_model=list[SessionOut])
def get_sessions(
    teacher_id: int,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Return sessions for a teacher, newest first.

    Query params:
      limit  — max number of sessions to return (default 20, max 100)
      offset — pagination offset (default 0)
    """
    _get_teacher_or_404(teacher_id, db)

    limit = min(limit, 100)

    sessions = (
        db.query(CoachingSession)
        .filter(CoachingSession.teacher_id == teacher_id)
        .order_by(CoachingSession.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return sessions
