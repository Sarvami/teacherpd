from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import ChatConversation, ChatMessage, SessionLocal, Teacher, User, get_db
from app.routes.deps import get_current_user
from app.services.chat import generate_chat_response, probe_ollama
from app.services.rag import build_teacher_context
from models.teachup_schemas import (
    ChatMessageIn,
    ChatMessageResponse,
    ConversationDetailOut,
    ConversationOut,
    FeedbackRequest,
    StreamingChatRequest,
)

router = APIRouter(prefix="/api/chat", tags=["teachup-chat"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _get_or_create_conversation(
    db: Session,
    user: User,
    conversation_id: str | None,
    system_context: str | None,
) -> ChatConversation:
    if conversation_id:
        conv = (
            db.query(ChatConversation)
            .filter(ChatConversation.id == conversation_id, ChatConversation.user_id == user.id)
            .first()
        )
        if conv:
            return conv

    conv = ChatConversation(
        id=conversation_id or uuid.uuid4().hex,
        user_id=user.id,
        title=None,
        system_context=system_context,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def _build_history(messages: list) -> list[dict]:
    """
    Convert a flat list of ChatMessageIn into the session_history format
    expected by generate_chat_response: pairs of {message, ai_response}.
    Pairs up consecutive user→assistant turns; unpaired user messages get
    ai_response=None.
    """
    history: list[dict] = []
    i = 0
    msgs = [m for m in messages if m.role in ("user", "assistant")]
    while i < len(msgs):
        if msgs[i].role == "user":
            user_text = msgs[i].content
            ai_text = None
            if i + 1 < len(msgs) and msgs[i + 1].role == "assistant":
                ai_text = msgs[i + 1].content
                i += 2
            else:
                i += 1
            history.append({"message": user_text, "ai_response": ai_text})
        else:
            i += 1
    return history[-10:]  # keep last 10 pairs max


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == user.id)
        .order_by(ChatConversation.updated_at.desc())
        .limit(200)
        .all()
    )
    return [
        ConversationOut(
            id=c.id,
            title=c.title,
            systemContext=c.system_context,
            updatedAt=c.updated_at,
        )
        for c in convs
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(conversation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id, ChatConversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return ConversationDetailOut(
        id=conv.id,
        title=conv.title,
        systemContext=conv.system_context,
        messages=[
            ChatMessageIn(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.created_at,
            )
            for m in msgs
        ],
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id, ChatConversation.user_id == user.id)
        .first()
    )
    if not conv:
        return
    db.delete(conv)
    db.commit()


@router.post("/conversations/{conversation_id}/feedback", status_code=204)
def feedback(
    conversation_id: str,
    payload: FeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id, ChatConversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.id == payload.messageId, ChatMessage.conversation_id == conversation_id)
        .first()
    )
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    msg.feedback = payload.rating
    db.add(msg)
    db.commit()
    return


@router.post("/message", response_model=ChatMessageResponse)
def send_message(
    payload: StreamingChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find latest user message
    last_user = next((m for m in reversed(payload.messages) if m.role == "user"), None)
    if not last_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user message")

    conv = _get_or_create_conversation(db, user, payload.conversationId, payload.systemContext)

    conv_id = conv.id

    # Persist incoming messages (best-effort; skip duplicates)
    existing_ids = {
        mid
        for (mid,) in db.query(ChatMessage.id)
        .filter(ChatMessage.conversation_id == conv_id)
        .all()
    }
    for m in payload.messages[-40:]:
        if m.id in existing_ids:
            continue
        db.add(
            ChatMessage(
                id=m.id,
                conversation_id=conv_id,
                role=m.role,
                content=m.content,
            )
        )
    db.commit()

    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    teacher_ctx = build_teacher_context(teacher) if teacher else ""
    # Build proper user↔assistant history pairs (exclude the last user message
    # which is being sent now — it's passed as user_message directly)
    history = _build_history(payload.messages[:-1])

    ai = generate_chat_response(
        user_message=last_user.content,
        session_history=history,
        teacher_context=teacher_ctx,
        system_context=payload.systemContext,
        streaming=False,
    )

    assistant_id = uuid.uuid4().hex
    msg = ChatMessage(
        id=assistant_id,
        conversation_id=conv.id,
        role="assistant",
        content=str(ai),
        model=None,
        tokens_used=None,
    )
    db.add(msg)
    conv.updated_at = _now()
    db.add(conv)
    db.commit()

    return ChatMessageResponse(
        conversationId=conv.id,
        assistantMessage=ChatMessageIn(
            id=assistant_id,
            role="assistant",
            content=str(ai),
            timestamp=_now(),
        ),
    )


@router.post("/stream")
def stream_chat(
    payload: StreamingChatRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    last_user = next((m for m in reversed(payload.messages) if m.role == "user"), None)
    if not last_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user message")

    conv = _get_or_create_conversation(db, user, payload.conversationId, payload.systemContext)
    conv_id = conv.id

    # SSE sends headers immediately; preflight Ollama so clients get a proper 503 instead of a 200 + abrupt close.
    try:
        probe_ollama(timeout=2)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI coaching service is currently unavailable. Make sure Ollama is running.",
        )

    # Persist incoming messages (skip duplicates)
    existing_ids = {
        mid
        for (mid,) in db.query(ChatMessage.id)
        .filter(ChatMessage.conversation_id == conv.id)
        .all()
    }
    for m in payload.messages[-40:]:
        if m.id in existing_ids:
            continue
        db.add(
            ChatMessage(
                id=m.id,
                conversation_id=conv.id,
                role=m.role,
                content=m.content,
            )
        )
    db.commit()

    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    teacher_ctx = build_teacher_context(teacher) if teacher else ""
    history = _build_history(payload.messages[:-1])

    assistant_id = uuid.uuid4().hex

    async def event_gen():
        # typing indicator / initial event
        yield _sse({"type": "start", "conversationId": conv_id, "messageId": assistant_id})

        # Stream tokens from Ollama; if client disconnects, stop.
        buf_parts: list[str] = []
        try:
            ai_iter = generate_chat_response(
                user_message=last_user.content,
                session_history=history,
                teacher_context=teacher_ctx,
                system_context=payload.systemContext,
                streaming=True,
            )
            for chunk in ai_iter:  # type: ignore[assignment]
                if await request.is_disconnected():
                    break
                buf_parts.append(chunk)
                yield _sse({"type": "token", "value": chunk})
        except Exception:
            yield _sse(
                {
                    "type": "error",
                    "message": "The AI coaching service is currently unavailable. Make sure Ollama is running.",
                }
            )

        full = "".join(buf_parts).strip()
        # Persist assistant message even if empty. Use a fresh DB session because the request-scoped
        # session may be closed before the stream finishes.
        db2 = SessionLocal()
        try:
            db2.add(
                ChatMessage(
                    id=assistant_id,
                    conversation_id=conv_id,
                    role="assistant",
                    content=full,
                )
            )
            conv2 = db2.query(ChatConversation).filter(ChatConversation.id == conv_id).first()
            if conv2:
                conv2.updated_at = _now()
                db2.add(conv2)
            db2.commit()
        finally:
            db2.close()

        yield _sse({"type": "done", "conversationId": conv_id, "messageId": assistant_id})

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
