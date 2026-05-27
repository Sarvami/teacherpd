from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import Lesson, User, get_db
from app.routes.deps import get_current_user
from app.services.chat import generate_chat_response
from models.teachup_schemas import (
    LessonCreate,
    LessonEnhanceRequest,
    LessonGenerateRequest,
    LessonOut,
    LessonUpdate,
)

router = APIRouter(prefix="/api/lessons", tags=["teachup-lessons"])


def _to_out(x: Lesson) -> LessonOut:
    return LessonOut(
        id=x.id,
        title=x.title,
        content=x.content,
        grade_level=x.grade_level,
        subject=x.subject,
        duration_minutes=x.duration_minutes,
        updated_at=x.updated_at,
    )


@router.get("", response_model=list[LessonOut])
def list_lessons(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Lesson)
        .filter(Lesson.user_id == user.id)
        .order_by(Lesson.updated_at.desc())
        .limit(200)
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("", response_model=LessonOut, status_code=201)
def create_lesson(payload: LessonCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = Lesson(
        id=uuid.uuid4().hex,
        user_id=user.id,
        title=payload.title,
        content=payload.content,
        grade_level=payload.grade_level,
        subject=payload.subject,
        duration_minutes=payload.duration_minutes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{lesson_id}", response_model=LessonOut)
def get_lesson(lesson_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return _to_out(row)


@router.put("/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: str,
    payload: LessonUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson(lesson_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.user_id == user.id)
        .first()
    )
    if not row:
        return
    db.delete(row)
    db.commit()
    return


@router.post("/generate")
def generate_lesson(
    payload: LessonGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = (
        "Generate a complete lesson plan with: title, objectives, materials, activities with timings, assessment, differentiation, reflection.\n"
        f"Grade: {payload.grade_level or 'unspecified'}\n"
        f"Subject: {payload.subject or 'unspecified'}\n"
        f"Topic/prompt: {payload.prompt}\n"
    )
    text = generate_chat_response(
        user_message=prompt,
        session_history=[],
        teacher_context="",
        system_context="lesson-planner",
        streaming=False,
    )
    return {"content": str(text)}


@router.post("/{lesson_id}/ai-enhance")
def enhance_lesson(
    lesson_id: str,
    payload: LessonEnhanceRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = lesson_id  # reserved for future context-aware enhancements
    instruction = payload.instruction or "Improve clarity, structure, and differentiation while staying grade-appropriate."
    prompt = f"Enhance the lesson content. Instruction: {instruction}\n\nLesson:\n{payload.content}"
    text = generate_chat_response(
        user_message=prompt,
        session_history=[],
        teacher_context="",
        system_context="lesson-planner",
        streaming=False,
    )
    return {"content": str(text)}
