from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth ───────────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be blank")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class AuthUser(BaseModel):
    id: int
    email: EmailStr
    name: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


# ── Profile (maps onto TeacherPD Teacher) ───────────────────────────────────


class ProfileOut(BaseModel):
    teacher_id: int
    name: str
    grades_taught: Optional[str] = None
    subjects_taught: Optional[str] = None
    years_of_experience: Optional[int] = None
    school: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    instruction_language: Optional[str] = None
    coaching_language: Optional[str] = None
    biggest_challenge: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    grades_taught: Optional[str] = Field(None, max_length=100)
    subjects_taught: Optional[str] = Field(None, max_length=255)
    years_of_experience: Optional[int] = Field(None, ge=0, le=60)
    school: Optional[str] = Field(None, max_length=255)
    state: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    instruction_language: Optional[str] = Field(None, max_length=100)
    coaching_language: Optional[str] = Field(None, max_length=200)
    biggest_challenge: Optional[str] = Field(None, max_length=1000)


class SubjectAddRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)


# ── Chat ───────────────────────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None


class StreamingChatRequest(BaseModel):
    conversationId: Optional[str] = None
    systemContext: Optional[Literal["general", "lesson-planner", "assessment", "reflection"]] = "general"
    messages: list[ChatMessageIn] = Field(default_factory=list)


class ConversationOut(BaseModel):
    id: str
    title: Optional[str] = None
    systemContext: Optional[str] = None
    updatedAt: datetime


class ConversationDetailOut(BaseModel):
    id: str
    title: Optional[str] = None
    systemContext: Optional[str] = None
    messages: list[ChatMessageIn]


class FeedbackRequest(BaseModel):
    messageId: str
    rating: Literal["up", "down"]


class ChatMessageResponse(BaseModel):
    conversationId: str
    assistantMessage: ChatMessageIn


# ── Lessons ────────────────────────────────────────────────────────────────


class LessonOut(BaseModel):
    id: str
    title: str
    content: str
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    duration_minutes: Optional[int] = None
    updated_at: datetime


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(default="")
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=1000)


class LessonUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1, le=1000)


class LessonGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=4000)
    grade_level: Optional[str] = None
    subject: Optional[str] = None


class LessonEnhanceRequest(BaseModel):
    content: str = Field(..., min_length=5)
    instruction: Optional[str] = Field(None, max_length=500)


# ── Assessments ────────────────────────────────────────────────────────────


class AssessmentOut(BaseModel):
    id: str
    title: str
    content_json: str
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    updated_at: datetime


class AssessmentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content_json: str = Field(default="{}")
    subject: Optional[str] = None
    grade_level: Optional[str] = None


class AssessmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content_json: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None


class AssessmentGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=4000)
    subject: Optional[str] = None
    grade_level: Optional[str] = None


# ── Professional Development ───────────────────────────────────────────────


class PDGoalOut(BaseModel):
    id: str
    title: str
    category: str
    progress: int
    updated_at: datetime


class PDGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Instruction", max_length=50)
    progress: int = Field(default=0, ge=0, le=100)


class PDGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=50)
    progress: Optional[int] = Field(None, ge=0, le=100)


class PDReflectionOut(BaseModel):
    id: str
    prompt: Optional[str] = None
    entry: str
    mood: Optional[str] = None
    created_at: datetime


class PDReflectionCreate(BaseModel):
    prompt: Optional[str] = None
    entry: str = Field(..., min_length=1)
    mood: Optional[str] = Field(None, max_length=20)


class CourseRecommendation(BaseModel):
    id: str
    title: str
    platform: str
    duration: str
    relevance: float
    why: str
