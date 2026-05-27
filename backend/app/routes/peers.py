"""
Peer matching routes.

GET /match-peer/{teacher_id} — return top peer matches for a teacher
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import Teacher, get_db
from app.services.matcher import get_peer_matches
from models.schemas import MatchResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["peers"])


@router.get("/match-peer/{teacher_id}", response_model=MatchResponse)
def match_peer(teacher_id: int, top_n: int = 3, db: Session = Depends(get_db)):
    """
    Find the top peer matches for a teacher.

    Similarity is computed via cosine distance on ChromaDB profile embeddings.
    Results are filtered to teachers sharing the same grade or subject.

    Returns an empty matches list (not an error) when:
    - The teacher has no profile embedding yet (just onboarded)
    - No other teachers share the same grade or subject
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id={teacher_id} not found.",
        )

    # Cap top_n to a sensible range
    top_n = max(1, min(top_n, 10))

    try:
        matches = get_peer_matches(teacher_id=teacher_id, db=db, top_n=top_n)
    except Exception as exc:
        logger.error("Peer matching failed for teacher %d: %s", teacher_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Peer matching is temporarily unavailable. Please try again later.",
        )

    return MatchResponse(teacher_id=teacher_id, matches=matches)
