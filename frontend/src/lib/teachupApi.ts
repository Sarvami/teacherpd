import { apiFetch } from './api'
import { loadAccessToken } from './teachupAuth'
import type {
  AssessmentCreate,
  AssessmentGenerateResult,
  AssessmentOut,
  AssessmentUpdate,
  AuthResponse,
  ConversationDetailOut,
  ConversationOut,
  LessonCreate,
  LessonEnhanceResult,
  LessonGenerateResult,
  LessonOut,
  LessonUpdate,
  PDGoalCreate,
  PDGoalOut,
  PDGoalUpdate,
  PDReflectionCreate,
  PDReflectionOut,
  PDRecommendation,
  ProfileOut,
  ProfileUpdate,
  SSEEvent,
  StreamingChatRequest,
} from './teachupTypes'

function authHeaders(): HeadersInit {
  const token = loadAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function register(payload: {
  email: string
  password: string
  name: string
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    credentials: 'include',
  })
}

export async function login(payload: {
  email: string
  password: string
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    credentials: 'include',
  })
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { ...authHeaders() },
  })
}

export async function me(): Promise<{ id: number; email: string; name: string }> {
  return apiFetch<{ id: number; email: string; name: string }>('/api/auth/me', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function getProfile(): Promise<ProfileOut> {
  return apiFetch<ProfileOut>('/api/profile', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function putProfile(payload: ProfileUpdate): Promise<ProfileOut> {
  return apiFetch<ProfileOut>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function streamChat(
  payload: StreamingChatRequest,
  onEvent: (ev: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '')
    const detail = (body && typeof body === 'object' && 'detail' in body)
      ? String((body as { detail?: string }).detail || '')
      : ''
    throw new Error(detail || `Stream failed (${res.status})`)
  }

  if (!res.body) {
    throw new Error('No stream body')
  }

  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  let buf = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })

    // SSE events are separated by blank lines
    while (true) {
      const idx = buf.indexOf('\n\n')
      if (idx === -1) break
      const rawEvent = buf.slice(0, idx)
      buf = buf.slice(idx + 2)

      const dataLines = rawEvent
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice('data:'.length).trim())

      if (!dataLines.length) continue
      const data = dataLines.join('\n')

      try {
        const ev = JSON.parse(data) as SSEEvent
        onEvent(ev)
      } catch {
        // ignore malformed events
      }
    }
  }
}

// ── Conversations ────────────────────────────────────────────────────────────

export async function listConversations(): Promise<ConversationOut[]> {
  return apiFetch<ConversationOut[]>('/api/chat/conversations', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function getConversation(id: string): Promise<ConversationDetailOut> {
  return apiFetch<ConversationDetailOut>(`/api/chat/conversations/${id}`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch<void>(`/api/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

// ── Lessons ──────────────────────────────────────────────────────────────────

export async function listLessons(): Promise<LessonOut[]> {
  return apiFetch<LessonOut[]>('/api/lessons', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function createLesson(payload: LessonCreate): Promise<LessonOut> {
  return apiFetch<LessonOut>('/api/lessons', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function getLesson(id: string): Promise<LessonOut> {
  return apiFetch<LessonOut>(`/api/lessons/${id}`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function updateLesson(id: string, payload: LessonUpdate): Promise<LessonOut> {
  return apiFetch<LessonOut>(`/api/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function deleteLesson(id: string): Promise<void> {
  await apiFetch<void>(`/api/lessons/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function generateLesson(payload: {
  prompt: string
  grade_level?: string | null
  subject?: string | null
}): Promise<LessonGenerateResult> {
  return apiFetch<LessonGenerateResult>('/api/lessons/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function enhanceLesson(
  id: string,
  payload: { content: string; instruction?: string | null },
): Promise<LessonEnhanceResult> {
  return apiFetch<LessonEnhanceResult>(`/api/lessons/${id}/ai-enhance`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

// ── Assessments ──────────────────────────────────────────────────────────────

export async function listAssessments(): Promise<AssessmentOut[]> {
  return apiFetch<AssessmentOut[]>('/api/assessments', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function createAssessment(payload: AssessmentCreate): Promise<AssessmentOut> {
  return apiFetch<AssessmentOut>('/api/assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function getAssessment(id: string): Promise<AssessmentOut> {
  return apiFetch<AssessmentOut>(`/api/assessments/${id}`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function updateAssessment(id: string, payload: AssessmentUpdate): Promise<AssessmentOut> {
  return apiFetch<AssessmentOut>(`/api/assessments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function deleteAssessment(id: string): Promise<void> {
  await apiFetch<void>(`/api/assessments/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function generateAssessment(payload: {
  prompt: string
  subject?: string | null
  grade_level?: string | null
}): Promise<AssessmentGenerateResult> {
  return apiFetch<AssessmentGenerateResult>('/api/assessments/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

// ── PD Goals ─────────────────────────────────────────────────────────────────

export async function listPDGoals(): Promise<PDGoalOut[]> {
  return apiFetch<PDGoalOut[]>('/api/pd/goals', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function createPDGoal(payload: PDGoalCreate): Promise<PDGoalOut> {
  return apiFetch<PDGoalOut>('/api/pd/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function updatePDGoal(id: string, payload: PDGoalUpdate): Promise<PDGoalOut> {
  return apiFetch<PDGoalOut>(`/api/pd/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function deletePDGoal(id: string): Promise<void> {
  await apiFetch<void>(`/api/pd/goals/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

// ── PD Reflections ────────────────────────────────────────────────────────────

export async function listPDReflections(): Promise<PDReflectionOut[]> {
  return apiFetch<PDReflectionOut[]>('/api/pd/reflections', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function createPDReflection(payload: PDReflectionCreate): Promise<PDReflectionOut> {
  return apiFetch<PDReflectionOut>('/api/pd/reflections', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

export async function deletePDReflection(id: string): Promise<void> {
  await apiFetch<void>(`/api/pd/reflections/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}

// ── PD Recommendations ────────────────────────────────────────────────────────

export async function getPDRecommendations(): Promise<PDRecommendation[]> {
  return apiFetch<PDRecommendation[]>('/api/pd/recommendations', {
    headers: { ...authHeaders() },
    credentials: 'include',
  })
}
