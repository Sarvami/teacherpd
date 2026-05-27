import os
from datetime import datetime
from datetime import timedelta

from dotenv import load_dotenv
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
    inspect,
    text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

load_dotenv()

_default_db = os.path.join(os.path.dirname(__file__), "..", "..", "teacherpd.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.abspath(_default_db)}")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── TeachUp auth & app models ───────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Optional link to a TeacherPD profile (so TeachUp can reuse /reflect, peers, etc.)
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)

    conversations = relationship("ChatConversation", back_populates="user")
    lessons = relationship("Lesson", back_populates="user")
    assessments = relationship("Assessment", back_populates="user")
    pd_goals = relationship("PDGoal", back_populates="user")
    pd_reflections = relationship("PDReflection", back_populates="user")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(String(64), primary_key=True)  # frontend-friendly id
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    system_context = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    pk = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(String(64), nullable=False)  # client-visible message id
    conversation_id = Column(String(64), ForeignKey("chat_conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user|assistant|system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Optional metadata
    model = Column(String(64), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    feedback = Column(String(10), nullable=True)  # up|down

    conversation = relationship("ChatConversation", back_populates="messages")

    __table_args__ = (UniqueConstraint("conversation_id", "id", name="uq_chat_message_conv_id"),)


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False, default="")
    grade_level = Column(String(50), nullable=True)
    subject = Column(String(100), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="lessons")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content_json = Column(Text, nullable=False, default="{}")
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="assessments")


class PDGoal(Base):
    __tablename__ = "pd_goals"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="Instruction")
    progress = Column(Integer, nullable=False, default=0)  # 0-100
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="pd_goals")


class PDReflection(Base):
    __tablename__ = "pd_reflections"

    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    prompt = Column(Text, nullable=True)
    entry = Column(Text, nullable=False)
    mood = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="pd_reflections")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)

    # TeachUp owner (nullable for legacy TeacherPD flows)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # ── Identity ─────────────────────────────────────────────────────────────
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)                      # optional

    # ── Qualifications & experience ───────────────────────────────────────────
    highest_qualification = Column(String(255), nullable=True)      # e.g. "B.Ed", "M.A."
    years_of_experience = Column(Integer, nullable=True)

    # ── School details ────────────────────────────────────────────────────────
    school = Column(String(255), nullable=True)
    school_type = Column(String(50), nullable=True)                 # government / private / aided
    school_location = Column(String(50), nullable=True)             # urban / semi-urban / rural
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    # ── Teaching context ──────────────────────────────────────────────────────
    subjects_taught = Column(String(255), nullable=True)            # comma-separated or free text
    grades_taught = Column(String(100), nullable=True)              # e.g. "Grade 5, Grade 6"
    instruction_language = Column(String(100), nullable=True)       # primary language in classroom

    # ── Self-reported profile ─────────────────────────────────────────────────
    biggest_challenge = Column(Text, nullable=True)                 # free text
    coaching_language = Column(String(50), default="English")       # preferred language for coaching

    sessions = relationship("CoachingSession", back_populates="teacher")

    user = relationship("User", back_populates="teacher_profile")


class CoachingSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    message = Column(Text, nullable=False)
    ai_response = Column(Text)
    theme = Column(String(100))  # classified challenge theme
    timestamp = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Teacher", back_populates="sessions")


def create_tables() -> None:
    """Create all tables if they don't exist."""
    # Lightweight, idempotent migrations for existing local DBs.
    inspector = inspect(engine)

    # If chat_messages is in the old shape (id as PK without pk column), rebuild it.
    if "chat_messages" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("chat_messages")}
        if "pk" not in cols:
            with engine.begin() as conn:
                conn.execute(text("DROP TABLE IF EXISTS chat_messages"))

    Base.metadata.create_all(bind=engine)

    if "teachers" in inspector.get_table_names():
        teacher_cols = {c["name"] for c in inspector.get_columns("teachers")}
        if "user_id" not in teacher_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE teachers ADD COLUMN user_id INTEGER"))


def get_db():
    """FastAPI dependency that yields a DB session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
