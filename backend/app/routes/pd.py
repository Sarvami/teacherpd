from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import PDGoal, PDReflection, User, get_db
from app.routes.deps import get_current_user
from app.services.chat import generate_chat_response
from models.teachup_schemas import (
    CourseRecommendation,
    PDGoalCreate,
    PDGoalOut,
    PDGoalUpdate,
    PDReflectionCreate,
    PDReflectionOut,
)

router = APIRouter(prefix="/api/pd", tags=["teachup-pd"])


def _goal_out(x: PDGoal) -> PDGoalOut:
    return PDGoalOut(
        id=x.id,
        title=x.title,
        category=x.category,
        progress=x.progress,
        updated_at=x.updated_at,
    )


def _ref_out(x: PDReflection) -> PDReflectionOut:
    return PDReflectionOut(
        id=x.id,
        prompt=x.prompt,
        entry=x.entry,
        mood=x.mood,
        created_at=x.created_at,
    )


@router.get("/goals", response_model=list[PDGoalOut])
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(PDGoal)
        .filter(PDGoal.user_id == user.id)
        .order_by(PDGoal.updated_at.desc())
        .limit(200)
        .all()
    )
    return [_goal_out(r) for r in rows]


@router.post("/goals", response_model=PDGoalOut, status_code=201)
def create_goal(payload: PDGoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = PDGoal(
        id=uuid.uuid4().hex,
        user_id=user.id,
        title=payload.title,
        category=payload.category,
        progress=payload.progress,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _goal_out(row)


@router.put("/goals/{goal_id}", response_model=PDGoalOut)
def update_goal(goal_id: str, payload: PDGoalUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(PDGoal)
        .filter(PDGoal.id == goal_id, PDGoal.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _goal_out(row)


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(PDGoal)
        .filter(PDGoal.id == goal_id, PDGoal.user_id == user.id)
        .first()
    )
    if not row:
        return
    db.delete(row)
    db.commit()
    return


@router.get("/reflections", response_model=list[PDReflectionOut])
def list_reflections(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(PDReflection)
        .filter(PDReflection.user_id == user.id)
        .order_by(PDReflection.created_at.desc())
        .limit(200)
        .all()
    )
    return [_ref_out(r) for r in rows]


@router.post("/reflections", response_model=PDReflectionOut, status_code=201)
def create_reflection(payload: PDReflectionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = PDReflection(
        id=uuid.uuid4().hex,
        user_id=user.id,
        prompt=payload.prompt,
        entry=payload.entry,
        mood=payload.mood,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ref_out(row)


@router.delete("/reflections/{reflection_id}", status_code=204)
def delete_reflection(reflection_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(PDReflection)
        .filter(PDReflection.id == reflection_id, PDReflection.user_id == user.id)
        .first()
    )
    if not row:
        return
    db.delete(row)
    db.commit()
    return


@router.get("/recommendations", response_model=list[CourseRecommendation])
def recommendations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Lightweight, AI-generated card suggestions.
    recent = (
        db.query(PDReflection)
        .filter(PDReflection.user_id == user.id)
        .order_by(PDReflection.created_at.desc())
        .limit(5)
        .all()
    )
    seed = "\n".join(r.entry for r in recent)
    prompt = (
        "Based on these teacher reflections, recommend 3 PD courses as JSON array with fields: title, platform, duration, relevance (0-1), why.\n"
        f"Reflections:\n{seed or '(none)'}"
    )
    text = generate_chat_response(
        user_message=prompt,
        session_history=[],
        teacher_context="",
        system_context="general",
        streaming=False,
    )

    # If the model didn't return valid JSON, return a safe fallback.
    try:
        import json as _json

        raw = _json.loads(str(text))
        out: list[CourseRecommendation] = []
        for i, item in enumerate(raw[:3]):
            out.append(
                CourseRecommendation(
                    id=str(item.get("id") or f"rec_{i+1}"),
                    title=str(item.get("title") or "PD Recommendation"),
                    platform=str(item.get("platform") or "UpTeach"),
                    duration=str(item.get("duration") or "2 hours"),
                    relevance=float(item.get("relevance") or 0.7),
                    why=str(item.get("why") or "Aligned to your recent reflections."),
                )
            )
        if out:
            return out
    except Exception:
        pass

    return [
        CourseRecommendation(
            id="rec_1",
            title="Formative Assessment in Action",
            platform="ISTE",
            duration="3 hours",
            relevance=0.78,
            why="Supports quicker feedback loops and student engagement.",
        ),
        CourseRecommendation(
            id="rec_2",
            title="Differentiation for Mixed-Ability Classrooms",
            platform="Coursera",
            duration="6 hours",
            relevance=0.74,
            why="Practical strategies for IEP/ELL/gifted supports.",
        ),
    ]
