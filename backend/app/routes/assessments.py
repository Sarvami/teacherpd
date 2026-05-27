from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import Assessment, User, get_db
from app.routes.deps import get_current_user
from app.services.chat import generate_chat_response
from models.teachup_schemas import (
    AssessmentCreate,
    AssessmentGenerateRequest,
    AssessmentOut,
    AssessmentUpdate,
)

router = APIRouter(prefix="/api/assessments", tags=["teachup-assessments"])


def _to_out(x: Assessment) -> AssessmentOut:
    return AssessmentOut(
        id=x.id,
        title=x.title,
        content_json=x.content_json,
        subject=x.subject,
        grade_level=x.grade_level,
        updated_at=x.updated_at,
    )


@router.get("", response_model=list[AssessmentOut])
def list_assessments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Assessment)
        .filter(Assessment.user_id == user.id)
        .order_by(Assessment.updated_at.desc())
        .limit(200)
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("", response_model=AssessmentOut, status_code=201)
def create_assessment(payload: AssessmentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = Assessment(
        id=uuid.uuid4().hex,
        user_id=user.id,
        title=payload.title,
        content_json=payload.content_json,
        subject=payload.subject,
        grade_level=payload.grade_level,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(assessment_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return _to_out(row)


@router.put("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: str,
    payload: AssessmentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.user_id == user.id)
        .first()
    )
    if not row:
        return
    db.delete(row)
    db.commit()
    return


@router.post("/generate")
def generate_assessment(
    payload: AssessmentGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = (
        "Generate a quiz as strict JSON with fields: title, questions[]. Each question has type, prompt, options?, answer, explanation.\n"
        f"Grade: {payload.grade_level or 'unspecified'}\n"
        f"Subject: {payload.subject or 'unspecified'}\n"
        f"Prompt: {payload.prompt}\n"
    )
    text = generate_chat_response(
        user_message=prompt,
        session_history=[],
        teacher_context="",
        system_context="assessment",
        streaming=False,
    )
    return {"content_json": str(text)}
