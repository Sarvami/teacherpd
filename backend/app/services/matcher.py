"""
Peer matching service.

Fetches a teacher's profile embedding from ChromaDB, finds the most
similar other teachers, applies a grade/subject relevance filter,
and returns ranked matches with a human-readable reason.
"""

from sqlalchemy.orm import Session

from app.db.database import Teacher
from app.services.embeddings import get_similar_teachers


def get_peer_matches(
    teacher_id: int,
    db: Session,
    top_n: int = 3,
) -> list[dict]:
    """
    Return up to *top_n* peer matches for *teacher_id*.

    Each match dict contains:
      teacher_id, name, school, grades_taught, subjects_taught,
      similarity_score, reason
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        return []

    similar = get_similar_teachers(teacher_id, n_results=top_n + 5)
    if not similar or not similar.get("ids"):
        return []

    ids_list = similar["ids"][0]
    metadatas_list = similar["metadatas"][0]
    distances_list = similar["distances"][0]

    matches: list[dict] = []

    for _chroma_id, meta, distance in zip(ids_list, metadatas_list, distances_list):
        matched_tid = int(meta.get("teacher_id", -1))
        if matched_tid == teacher_id:
            continue

        # Cosine distance → similarity (ChromaDB returns distance, not similarity)
        similarity = round(1 - distance, 4)

        matched_teacher = db.query(Teacher).filter(Teacher.id == matched_tid).first()
        if not matched_teacher:
            continue

        # Relevance filter: must share at least one grade OR one subject
        same_grade = _overlap(teacher.grades_taught, matched_teacher.grades_taught)
        same_subject = _overlap(teacher.subjects_taught, matched_teacher.subjects_taught)
        if not same_grade and not same_subject:
            continue

        reason = _build_reason(teacher, matched_teacher, meta, same_grade, same_subject)

        matches.append(
            {
                "teacher_id": matched_tid,
                "name": matched_teacher.name,
                "school": matched_teacher.school,
                "grades_taught": matched_teacher.grades_taught,
                "subjects_taught": matched_teacher.subjects_taught,
                "similarity_score": similarity,
                "reason": reason,
            }
        )

        if len(matches) >= top_n:
            break

    matches.sort(key=lambda m: m["similarity_score"], reverse=True)
    return matches


def _overlap(a: str | None, b: str | None) -> bool:
    """
    Return True if the two comma-separated value strings share at least one token.
    Case-insensitive. Handles None gracefully.
    """
    if not a or not b:
        return False
    set_a = {v.strip().lower() for v in a.split(",") if v.strip()}
    set_b = {v.strip().lower() for v in b.split(",") if v.strip()}
    return bool(set_a & set_b)


def _build_reason(
    teacher: Teacher,
    peer: Teacher,
    peer_meta: dict,
    same_grade: bool,
    same_subject: bool,
) -> str:
    """Compose a short human-readable reason for the match."""
    parts: list[str] = []

    if same_grade and same_subject:
        parts.append(
            f"teaches the same grades ({peer.grades_taught}) "
            f"and subjects ({peer.subjects_taught})"
        )
    elif same_grade:
        parts.append(f"teaches the same grades ({peer.grades_taught})")
    elif same_subject:
        parts.append(f"teaches the same subjects ({peer.subjects_taught})")

    peer_themes = peer_meta.get("themes", "")
    if peer_themes:
        parts.append(f"has worked on similar challenges: {peer_themes}")

    # Add school context if it adds useful signal
    if peer.school_location and peer.school_type:
        parts.append(f"also works in a {peer.school_location} {peer.school_type} school")

    if not parts:
        return "Similar teaching profile."

    return f"{peer.name} {' and '.join(parts)}."
