"""
Embedding service — wraps sentence-transformers and ChromaDB.

Two ChromaDB collections are used:
  - "pedagogy_docs"   : chunked knowledge-base documents for RAG
  - "teacher_profiles": one embedding per teacher for peer matching
"""

import os
from typing import Optional

import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")

# Shared model — loaded once at import time
_model: Optional[SentenceTransformer] = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False),
    )


def get_docs_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="pedagogy_docs",
        metadata={"hnsw:space": "cosine"},
    )


def get_profiles_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="teacher_profiles",
        metadata={"hnsw:space": "cosine"},
    )


def embed_text(text: str) -> list[float]:
    """Return a normalised embedding vector for a single string."""
    return get_model().encode(text, normalize_embeddings=True).tolist()


# ── Knowledge-base document loading ─────────────────────────────────────────

def load_documents_from_dir(docs_dir: str) -> None:
    """
    Walk *docs_dir*, read every .txt file, split into ~500-char chunks,
    and upsert them into the pedagogy_docs collection.
    """
    collection = get_docs_collection()
    doc_id = 0

    for filename in os.listdir(docs_dir):
        if not filename.endswith(".txt"):
            continue
        filepath = os.path.join(docs_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()

        chunks = _chunk_text(text, chunk_size=500, overlap=50)
        for chunk in chunks:
            doc_id += 1
            collection.upsert(
                ids=[f"doc_{doc_id}"],
                embeddings=[embed_text(chunk)],
                documents=[chunk],
                metadatas=[{"source": filename}],
            )

    print(f"[embeddings] Loaded {doc_id} chunks from {docs_dir}")


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Simple character-level sliding-window chunker."""
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start += chunk_size - overlap
    return [c for c in chunks if c]


def retrieve_relevant_chunks(query: str, n_results: int = 3) -> list[str]:
    """Return the top-n document chunks most similar to *query*."""
    collection = get_docs_collection()
    results = collection.query(
        query_embeddings=[embed_text(query)],
        n_results=n_results,
        include=["documents"],
    )
    docs: list[str] = results.get("documents", [[]])[0]
    return docs


# ── Teacher profile embeddings ───────────────────────────────────────────────

def build_profile_text(
    grade: Optional[str],
    subject: Optional[str],
    themes: list[str],
) -> str:
    """Construct a short text representation of a teacher's profile."""
    parts: list[str] = []
    if grade:
        parts.append(f"Grade: {grade}")
    if subject:
        parts.append(f"Subject: {subject}")
    if themes:
        parts.append(f"Challenges: {', '.join(themes)}")
    return ". ".join(parts) if parts else "General teacher"


def upsert_teacher_profile(
    teacher_id: int,
    grade: Optional[str],
    subject: Optional[str],
    themes: list[str],
    metadata: Optional[dict] = None,
) -> None:
    """Generate and store (or update) a teacher's profile embedding."""
    collection = get_profiles_collection()
    profile_text = build_profile_text(grade, subject, themes)
    embedding = embed_text(profile_text)

    meta = {
        "teacher_id": teacher_id,
        "grade": grade or "",
        "subject": subject or "",
        "themes": ",".join(themes),
    }
    if metadata:
        meta.update(metadata)

    collection.upsert(
        ids=[f"teacher_{teacher_id}"],
        embeddings=[embedding],
        documents=[profile_text],
        metadatas=[meta],
    )


def get_similar_teachers(
    teacher_id: int,
    n_results: int = 5,
) -> dict:
    """
    Query the profiles collection for teachers similar to *teacher_id*.
    Returns the raw ChromaDB result dict.
    """
    collection = get_profiles_collection()

    # Fetch the target teacher's embedding
    result = collection.get(
        ids=[f"teacher_{teacher_id}"],
        include=["embeddings"],
    )
    embeddings = result.get("embeddings")
    if not embeddings or len(embeddings) == 0:
        return {}

    query_embedding = embeddings[0]

    # Query for similar teachers (fetch extra to exclude self)
    similar = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results + 1,
        include=["documents", "metadatas", "distances"],
    )
    return similar
