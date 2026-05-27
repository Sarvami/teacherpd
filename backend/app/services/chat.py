from __future__ import annotations

import json
import os
from typing import Iterable, Iterator, Optional

import httpx

from app.services.embeddings import retrieve_relevant_chunks
from app.services.rag import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    build_coaching_prompt,
)


def build_system_preamble(system_context: str | None) -> str:
    if system_context == "lesson-planner":
        return "You are TeachUp, an expert lesson-planning assistant. Be practical, structured, and classroom-ready."
    if system_context == "assessment":
        return "You are TeachUp, an assessment designer. Generate clear questions and answer keys aligned to grade level."
    if system_context == "reflection":
        return "You are TeachUp, a coaching companion helping a teacher reflect and improve."
    return "You are TeachUp, an AI companion for teachers."


def _call_ollama_non_stream(prompt: str, timeout: int = 60) -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
    with httpx.Client(timeout=timeout) as client:
        res = client.post(url, json=payload)
        res.raise_for_status()
        return (res.json().get("response") or "").strip()


def probe_ollama(timeout: int = 2) -> None:
    """Raise if Ollama is unreachable/unhealthy."""
    url = f"{OLLAMA_BASE_URL}/api/tags"
    with httpx.Client(timeout=timeout) as client:
        res = client.get(url)
        res.raise_for_status()


def stream_ollama_tokens(prompt: str, timeout: int = 120) -> Iterator[str]:
    """Yield text tokens/chunks as Ollama streams NDJSON lines."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": True}
    with httpx.stream("POST", url, json=payload, timeout=timeout) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            chunk = obj.get("response")
            if chunk:
                yield str(chunk)
            if obj.get("done") is True:
                break


def generate_chat_response(
    user_message: str,
    session_history: list[dict],
    teacher_context: str = "",
    system_context: str | None = None,
    streaming: bool = False,
) -> str | Iterator[str]:
    chunks = retrieve_relevant_chunks(user_message, n_results=3)
    preamble = build_system_preamble(system_context)
    prompt = build_coaching_prompt(
        teacher_message=f"{preamble}\n\n{user_message}",
        context_chunks=chunks,
        session_history=session_history,
        teacher_context=teacher_context,
    )

    if streaming:
        return stream_ollama_tokens(prompt)
    return _call_ollama_non_stream(prompt)
