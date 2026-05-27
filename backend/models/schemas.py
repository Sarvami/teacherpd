from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Teacher schemas ──────────────────────────────────────────────────────────

class TeacherCreate(BaseModel):
    # Identity
    name: str = Field(..., min_length=1, max_length=255, description="Teacher's full name")
    age: Optional[int] = Field(None, ge=18, le=80, description="Age in years")
    gender: Optional[str] = Field(None, max_length=50, description="e.g. Female, Male, Non-binary")

    # Qualifications & experience
    highest_qualification: Optional[str] = Field(
        None, max_length=255,
        description="e.g. B.Ed, M.A. Education, D.El.Ed"
    )
    years_of_experience: Optional[int] = Field(
        None, ge=0, le=60,
        description="Total years of teaching experience"
    )

    # School details
    school: Optional[str] = Field(None, max_length=255, description="School name")
    school_type: Optional[Literal["government", "private", "aided"]] = Field(
        None, description="Type of school"
    )
    school_location: Optional[Literal["urban", "semi-urban", "rural"]] = Field(
        None, description="Location type of the school"
    )
    state: Optional[str] = Field(None, max_length=100, description="State in India")
    district: Optional[str] = Field(None, max_length=100, description="District")

    # Teaching context
    subjects_taught: Optional[str] = Field(
        None, max_length=255,
        description="Subjects taught, e.g. 'Mathematics, Science'"
    )
    grades_taught: Optional[str] = Field(
        None, max_length=100,
        description="Grades/classes taught, e.g. 'Grade 5, Grade 6'"
    )
    instruction_language: Optional[str] = Field(
        None, max_length=100,
        description="Primary language used in the classroom"
    )

    # Self-reported profile
    biggest_challenge: Optional[str] = Field(
        None, max_length=1000,
        description="Teacher's self-reported biggest challenge (free text)"
    )
    coaching_language: str = Field(
        "English", max_length=50,
        description="Preferred language for coaching responses"
    )

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class TeacherOut(TeacherCreate):
    id: int

    model_config = {"from_attributes": True}


# ── Coaching schemas ─────────────────────────────────────────────────────────

class ReflectRequest(BaseModel):
    teacher_id: int = Field(..., gt=0, description="Must be a positive integer")
    message: str = Field(
        ..., min_length=5, max_length=2000,
        description="Teacher's reflection message"
    )

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message must not be blank")
        return v.strip()


class ReflectResponse(BaseModel):
    teacher_id: int
    message: str
    ai_response: str
    theme: str
    session_id: int


# ── Session schemas ──────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: int
    teacher_id: int
    message: str
    ai_response: Optional[str]
    theme: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}


# ── Peer matching schemas ────────────────────────────────────────────────────

class PeerMatch(BaseModel):
    teacher_id: int
    name: str
    school: Optional[str]
    grades_taught: Optional[str]
    subjects_taught: Optional[str]
    similarity_score: float
    reason: str


class MatchResponse(BaseModel):
    teacher_id: int
    matches: list[PeerMatch]
