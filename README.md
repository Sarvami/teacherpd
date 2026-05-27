# TeachUp — AI Teacher Coaching Companion

An AI-powered professional development platform for teachers. TeachUp provides streaming coaching conversations, lesson planning, assessment generation, PD goal tracking, and peer matching — all personalized to each teacher's profile.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI (Python 3.11), SQLAlchemy, SQLite (dev) / PostgreSQL (prod) |
| AI | Ollama (local LLM, default model: `gemma:2b`) |
| Vector DB | ChromaDB (pedagogy knowledge base + teacher profile embeddings) |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Auth | JWT (access token) + HTTP-only refresh cookie |

---

## Project Structure

```
teacherpd/
├── backend/
│   ├── app/
│   │   ├── db/database.py        # SQLAlchemy models + DB setup
│   │   ├── routes/               # FastAPI routers
│   │   │   ├── auth.py           # /api/auth/*
│   │   │   ├── profile.py        # /api/profile
│   │   │   ├── chat.py           # /api/chat/* (streaming SSE)
│   │   │   ├── lessons.py        # /api/lessons/*
│   │   │   ├── assessments.py    # /api/assessments/*
│   │   │   ├── pd.py             # /api/pd/* (goals, reflections, recommendations)
│   │   │   ├── coaching.py       # /teachers, /reflect, /sessions (legacy)
│   │   │   └── peers.py          # /match-peer (peer matching)
│   │   ├── services/
│   │   │   ├── auth.py           # JWT + password hashing
│   │   │   ├── chat.py           # Ollama streaming + non-streaming
│   │   │   ├── embeddings.py     # ChromaDB + sentence-transformers
│   │   │   ├── rag.py            # RAG pipeline + prompt builder
│   │   │   └── matcher.py        # Peer matching logic
│   │   └── main.py               # App entry point, CORS, startup
│   ├── data/
│   │   ├── chroma/               # ChromaDB vector store (persisted)
│   │   └── knowledge_base/       # .txt pedagogy documents for RAG
│   ├── models/
│   │   ├── schemas.py            # Legacy coaching Pydantic schemas
│   │   └── teachup_schemas.py    # TeachUp API Pydantic schemas
│   ├── teacherpd.db              # SQLite database (dev)
│   ├── seed.py                   # Seeds sample teacher data
│   ├── .env                      # Local environment config
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── features/
    │   │   ├── auth/             # Login + register card
    │   │   ├── chat/             # Streaming AI chat (TeachUpChat)
    │   │   ├── coaching/         # Legacy coaching chat (CoachChat)
    │   │   ├── insights/         # Session history + peer matches panel
    │   │   ├── onboarding/       # Legacy teacher onboarding card
    │   │   └── profile/          # Profile setup + edit card
    │   ├── components/           # Shared UI (Button, Card, MultiSelect, etc.)
    │   ├── lib/
    │   │   ├── api.ts            # Base fetch wrapper + ApiError
    │   │   ├── teachupApi.ts     # All typed API functions
    │   │   ├── teachupAuth.ts    # Token storage (localStorage)
    │   │   └── teachupTypes.ts   # TypeScript types matching backend schemas
    │   └── App.tsx               # Root: auth → profile setup → chat
    ├── .env                      # VITE_BACKEND_URL
    └── vite.config.ts            # Dev proxy: /api → localhost:8000
```

---

## Prerequisites

- **Python 3.11** (via Anaconda or system install)
- **Node.js 18+**
- **Ollama** — [ollama.com](https://ollama.com) — running locally with `gemma:2b` pulled

```bash
# Pull the model once
ollama pull gemma:2b
```

---

## Setup & Running

### 1. Backend

```bash
cd backend

# Activate your Python environment (Anaconda example)
conda activate teacherpd

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

The backend starts at **http://localhost:8000**.  
On first run it automatically:
- Creates all SQLite tables
- Loads the pedagogy knowledge base into ChromaDB (117 chunks)

### 2. Frontend

```bash
cd frontend

# Install dependencies (only needed once)
npm install

# Start the dev server
npm run dev
```

The frontend starts at **http://localhost:5173**.  
The Vite dev proxy forwards all `/api` and `/health` requests to `localhost:8000` — no CORS issues.

### 3. Seed sample teachers (optional)

```bash
cd backend
python seed.py
```

Adds 5 sample teachers with profile embeddings for testing peer matching.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./teacherpd.db` | Switch to `postgresql://...` for production |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gemma:2b` | Model name (any Ollama-compatible model) |
| `TEACHUP_JWT_SECRET` | `teachup-dev-secret-change-me` | **Change before deploying** |
| `TEACHUP_ACCESS_TTL_MIN` | `30` | Access token lifetime in minutes |
| `TEACHUP_REFRESH_TTL_DAYS` | `30` | Refresh token lifetime in days |
| `CHROMA_PERSIST_DIR` | `./data/chroma` | ChromaDB storage path |

### Frontend — `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend URL used by the Vite dev proxy |

---

## API Overview

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, returns JWT |
| POST | `/api/auth/logout` | Clear refresh cookie |
| POST | `/api/auth/refresh` | Rotate tokens via refresh cookie |
| GET | `/api/auth/me` | Current user info |

### Profile
| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` | Get teacher profile |
| PUT | `/api/profile` | Create or update profile |

### Chat (streaming SSE)
| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/stream` | Stream AI response (SSE) |
| POST | `/api/chat/message` | Non-streaming AI response |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}` | Get conversation + messages |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |
| POST | `/api/chat/conversations/{id}/feedback` | Rate a message (up/down) |

### Lessons
| Method | Path | Description |
|---|---|---|
| GET | `/api/lessons` | List lessons |
| POST | `/api/lessons` | Create lesson |
| GET | `/api/lessons/{id}` | Get lesson |
| PUT | `/api/lessons/{id}` | Update lesson |
| DELETE | `/api/lessons/{id}` | Delete lesson |
| POST | `/api/lessons/generate` | AI-generate a lesson plan |
| POST | `/api/lessons/{id}/ai-enhance` | AI-enhance existing lesson |

### Assessments
| Method | Path | Description |
|---|---|---|
| GET | `/api/assessments` | List assessments |
| POST | `/api/assessments` | Create assessment |
| GET | `/api/assessments/{id}` | Get assessment |
| PUT | `/api/assessments/{id}` | Update assessment |
| DELETE | `/api/assessments/{id}` | Delete assessment |
| POST | `/api/assessments/generate` | AI-generate a quiz |

### Professional Development
| Method | Path | Description |
|---|---|---|
| GET | `/api/pd/goals` | List PD goals |
| POST | `/api/pd/goals` | Create PD goal |
| PUT | `/api/pd/goals/{id}` | Update PD goal |
| DELETE | `/api/pd/goals/{id}` | Delete PD goal |
| GET | `/api/pd/reflections` | List reflections |
| POST | `/api/pd/reflections` | Create reflection |
| DELETE | `/api/pd/reflections/{id}` | Delete reflection |
| GET | `/api/pd/recommendations` | AI-generated course recommendations |

### Legacy Coaching (no auth required)
| Method | Path | Description |
|---|---|---|
| POST | `/teachers` | Create teacher (legacy onboarding) |
| GET | `/teachers/{id}` | Get teacher |
| POST | `/reflect` | Submit reflection, get AI coaching response |
| GET | `/sessions/{teacher_id}` | Get session history |
| GET | `/match-peer/{teacher_id}` | Find peer matches via ChromaDB |

---

## Data Model Notes

**Grades and subjects** are stored as normalized comma-separated strings using a controlled vocabulary:
- Grades: `"Grade 1, Grade 5"` (Pre-K through Grade 12)
- Subjects: `"Mathematics, Science, Geography"` (17 predefined subjects)

This ensures peer matching (which splits on commas) works reliably and the data is queryable.

**Authentication flow:**
1. Register/login → backend returns a short-lived JWT access token + sets an HTTP-only refresh cookie
2. Frontend stores the access token in `localStorage` and sends it as `Authorization: Bearer <token>`
3. On expiry, call `POST /api/auth/refresh` to rotate both tokens

---

## How the AI Works

1. User sends a message
2. Backend embeds the message and retrieves the top 3 relevant chunks from the pedagogy knowledge base (ChromaDB RAG)
3. Teacher's profile context is injected into the prompt
4. The full prompt is sent to Ollama (Gemma 2B by default)
5. Tokens stream back via SSE and are displayed in real time

The knowledge base covers: pedagogy foundations, coaching frameworks, questioning techniques, student motivation, literacy, early years, secondary education, SEN, and technology in teaching.

---

## Known Limitations

- Ollama must be running locally — there is no cloud LLM fallback
- The app shows a clear "API offline" indicator and a 503 error if Ollama is unreachable
- SQLite is used by default; switch `DATABASE_URL` to PostgreSQL for any multi-user or production deployment
