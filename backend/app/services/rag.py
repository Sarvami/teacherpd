"""
RAG pipeline — retrieves relevant pedagogy chunks from ChromaDB,
then calls Gemma via Ollama to generate a coaching response.

Also exposes classify_theme() which tags a teacher message with one
of the predefined challenge themes.
"""

import os
from typing import Optional

import httpx
from dotenv import load_dotenv

from app.services.embeddings import retrieve_relevant_chunks

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma:2b")

CHALLENGE_THEMES = [
    "classroom management",
    "student engagement",
    "assessment",
    "inclusion",
    "curriculum planning",
    "parent communication",
    "teacher wellbeing",
    "technology integration",
    "differentiated instruction",
    "other",
]


def _call_ollama(prompt: str, timeout: int = 60) -> str:
    """Send a prompt to Ollama and return the generated text."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    with httpx.Client(timeout=timeout) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
    return response.json().get("response", "").strip()


def build_teacher_context(teacher) -> str:
    """
    Compose a one-sentence context line from the teacher's profile.

    Example output:
      "This teacher teaches Grade 5 Mathematics in a rural government school
       in Pune, Maharashtra, with 8 years of experience."

    Only includes fields that are actually populated so the sentence stays
    natural even for partially-filled profiles.
    """
    parts: list[str] = []

    # Teaching context — most important for coaching relevance
    if teacher.grades_taught and teacher.subjects_taught:
        parts.append(f"teaches {teacher.grades_taught} {teacher.subjects_taught}")
    elif teacher.grades_taught:
        parts.append(f"teaches {teacher.grades_taught}")
    elif teacher.subjects_taught:
        parts.append(f"teaches {teacher.subjects_taught}")

    # School context
    school_desc_parts: list[str] = []
    if teacher.school_location:
        school_desc_parts.append(teacher.school_location)
    if teacher.school_type:
        school_desc_parts.append(f"{teacher.school_type} school")
    elif teacher.school:
        school_desc_parts.append(f"school ({teacher.school})")

    if school_desc_parts:
        parts.append(f"in a {' '.join(school_desc_parts)}")

    # Location
    location_parts: list[str] = []
    if teacher.district:
        location_parts.append(teacher.district)
    if teacher.state:
        location_parts.append(teacher.state)
    if location_parts:
        parts.append(f"in {', '.join(location_parts)}")

    # Experience
    if teacher.years_of_experience is not None:
        yrs = teacher.years_of_experience
        parts.append(f"with {yrs} year{'s' if yrs != 1 else ''} of experience")

    # Instruction language (only if different from coaching language)
    if teacher.instruction_language:
        parts.append(f"teaching in {teacher.instruction_language}")

    if not parts:
        return ""

    sentence = "This teacher " + ", ".join(parts) + "."

    # Append self-reported challenge as a separate sentence if present
    if teacher.biggest_challenge:
        sentence += f" Their biggest self-reported challenge is: \"{teacher.biggest_challenge.strip()}\""

    return sentence


def build_coaching_prompt(
    teacher_message: str,
    context_chunks: list[str],
    session_history: list[dict],
    teacher_context: str = "",
) -> str:
    """
    Assemble the full prompt sent to the LLM.

    *session_history* — list of dicts with keys 'message' and 'ai_response',
                        ordered oldest-first (last 3-5 sessions).
    *teacher_context* — one-sentence profile summary from build_teacher_context().
    """
    history_text = ""
    if session_history:
        lines = []
        for s in session_history:
            lines.append(f"Teacher: {s['message']}")
            if s.get("ai_response"):
                lines.append(f"Coach: {s['ai_response']}")
        history_text = "\n".join(lines)

    context_text = "\n---\n".join(context_chunks) if context_chunks else ""

    # Build optional blocks — omit entirely when empty so the prompt stays clean
    teacher_context_block = (
        f"[Teacher profile]\n{teacher_context}"
        if teacher_context
        else ""
    )
    context_block = (
        f"[Background knowledge — weave in naturally if relevant, don't quote directly]\n{context_text}"
        if context_text
        else ""
    )
    history_block = (
        f"[Previous exchanges with this teacher]\n{history_text}"
        if history_text
        else ""
    )

    prompt = f"""You are an experienced teaching coach speaking directly with a colleague. You have classroom experience yourself. You are direct, warm, and specific — never generic.

STRICT OUTPUT FORMAT — violating any rule makes the response useless:

RULE 1 — READ WHAT THEY TRIED FIRST.
The teacher's message may mention strategies they have already attempted (e.g. punishments, rewards, interactive activities, seating changes). You must acknowledge those specific attempts by name. Never suggest something they already said they tried. If you do, your response is wrong.

RULE 2 — NO FILLER SENTENCES.
Do not write "I understand how frustrating that must be", "That sounds really challenging", "It's great that you're reflecting on this", or any other sentence that doesn't move the conversation forward. Start with the insight, not the empathy performance.

RULE 3 — 3 SENTENCES MAXIMUM before the question.
Count them. If you have written 4 sentences before the question, delete one. No bullet points. No headers. No lists.

RULE 4 — ONE QUESTION. EXACTLY ONE. AT THE END.
Your response must end with a single question mark. Not two questions joined by "and". Not "What do you think? Have you tried...?" — one question, full stop. The question must be specific to what this teacher just described — not a generic "What would you do differently?"

RULE 5 — IF THE MESSAGE IS VAGUE, ASK FOR CONTEXT INSTEAD OF ADVISING.
If the teacher hasn't said what they've already tried, what subject/grade is involved, or what the behaviour actually looks like — ask ONE clarifying question and nothing else. Do not give advice based on assumptions.

RULE 6 — STRATEGY MUST BE CONCRETE AND NEXT-LESSON READY.
Not "build relationships" or "make it relevant". Something they can do in the next 48 hours. Name the technique. Describe what it looks like in practice.

RULE 7 — USE THE TEACHER PROFILE TO CALIBRATE.
A first-year teacher in a rural government school needs different advice than a 20-year veteran in a private urban school. Use the profile to make the response feel like it was written for this specific person.

RULE 8 — USE BACKGROUND KNOWLEDGE INVISIBLY.
If the knowledge base contains something relevant, let it shape your advice — but never cite it, quote it, or say "research shows". It should feel like your own experience talking.

{teacher_context_block}

{context_block}

{history_block}

Teacher: {teacher_message}

Coach:"""
    return prompt


def get_coaching_response(
    teacher_message: str,
    session_history: list[dict],
    teacher_context: str = "",
) -> str:
    """
    Full RAG pipeline:
    1. Retrieve top-3 relevant chunks from ChromaDB.
    2. Build prompt with teacher context + knowledge context + history.
    3. Call Ollama/Gemma.
    4. Return the response string.
    """
    chunks = retrieve_relevant_chunks(teacher_message, n_results=3)
    prompt = build_coaching_prompt(teacher_message, chunks, session_history, teacher_context)
    return _call_ollama(prompt)


def classify_theme(teacher_message: str) -> str:
    """
    Ask the LLM to tag the message with one predefined challenge theme.
    Falls back to 'other' if the response can't be matched.
    """
    themes_list = "\n".join(f"- {t}" for t in CHALLENGE_THEMES)
    prompt = f"""You are a classifier. Given the teacher's message below, choose the single most relevant challenge theme from this list:

{themes_list}

Teacher message: "{teacher_message}"

Reply with ONLY the theme name, exactly as written above. Do not add any explanation."""

    raw = _call_ollama(prompt, timeout=30).lower().strip()

    for theme in CHALLENGE_THEMES:
        if theme in raw:
            return theme
    return "other"
