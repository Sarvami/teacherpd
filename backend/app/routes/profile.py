from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import Teacher, User, get_db
from app.routes.deps import get_current_user
from app.services.embeddings import upsert_teacher_profile
from app.services.rag import build_teacher_context
from models.teachup_schemas import ProfileOut, ProfileUpdate, SubjectAddRequest

router = APIRouter(prefix="/api/profile", tags=["teachup-profile"])


def _teacher_to_profile(t: Teacher) -> ProfileOut:
    return ProfileOut(
        teacher_id=t.id,
        name=t.name,
        grades_taught=t.grades_taught,
        subjects_taught=t.subjects_taught,
        years_of_experience=t.years_of_experience,
        school=t.school,
        state=t.state,
        district=t.district,
        instruction_language=t.instruction_language,
        coaching_language=t.coaching_language,
        biggest_challenge=t.biggest_challenge,
    )


def _embedding_metadata(teacher: Teacher) -> dict:
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


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not created")
    return _teacher_to_profile(teacher)


@router.put("", response_model=ProfileOut)
def put_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        # Create a TeacherPD teacher row bound to this user
        teacher = Teacher(user_id=user.id, name=user.name)
        db.add(teacher)
        db.commit()
        db.refresh(teacher)

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(teacher, k, v)

    # Ensure name always exists
    if not teacher.name:
        teacher.name = user.name

    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    # Update embedding so peer matching + RAG are profile-aware
    upsert_teacher_profile(
        teacher_id=teacher.id,
        grade=teacher.grades_taught,
        subject=teacher.subjects_taught,
        themes=[],
        metadata=_embedding_metadata(teacher),
    )

    return _teacher_to_profile(teacher)


@router.post("/subjects", response_model=ProfileOut)
def add_subject(
    payload: SubjectAddRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not created")

    subj = payload.subject.strip()
    existing = [s.strip() for s in (teacher.subjects_taught or "").split(",") if s.strip()]
    if subj and subj not in existing:
        existing.append(subj)
        teacher.subjects_taught = ", ".join(existing)
        db.add(teacher)
        db.commit()
        db.refresh(teacher)

    return _teacher_to_profile(teacher)


@router.delete("/subjects/{subject}", response_model=ProfileOut)
def remove_subject(
    subject: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not created")

    subject_norm = subject.strip().lower()
    parts = [s.strip() for s in (teacher.subjects_taught or "").split(",") if s.strip()]
    filtered = [s for s in parts if s.lower() != subject_norm]
    teacher.subjects_taught = ", ".join(filtered)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return _teacher_to_profile(teacher)
