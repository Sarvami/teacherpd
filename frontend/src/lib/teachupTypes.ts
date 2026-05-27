export type AuthUser = {
  id: number
  email: string
  name: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type ProfileOut = {
  teacher_id: number
  name: string
  grades_taught?: string | null
  subjects_taught?: string | null
  years_of_experience?: number | null
  school?: string | null
  state?: string | null
  district?: string | null
  instruction_language?: string | null
  coaching_language?: string | null
  biggest_challenge?: string | null
}

export type ProfileUpdate = {
  name?: string
  grades_taught?: string | null
  subjects_taught?: string | null
  years_of_experience?: number | null
  school?: string | null
  state?: string | null
  district?: string | null
  instruction_language?: string | null
  coaching_language?: string | null
  biggest_challenge?: string | null
}

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessageIn = {
  id: string
  role: ChatRole
  content: string
  timestamp?: string
}

export type StreamingChatRequest = {
  conversationId?: string | null
  systemContext?: 'general' | 'lesson-planner' | 'assessment' | 'reflection'
  messages: ChatMessageIn[]
}

export type ChatMessageResponse = {
  conversationId: string
  assistantMessage: ChatMessageIn
}

export type SSEEvent =
  | { type: 'start'; conversationId: string; messageId: string }
  | { type: 'token'; value: string }
  | { type: 'done'; conversationId: string; messageId: string }
  | { type: 'error'; message: string }

export type ConversationOut = {
  id: string
  title?: string | null
  systemContext?: string | null
  updatedAt: string
}

export type ConversationDetailOut = {
  id: string
  title?: string | null
  systemContext?: string | null
  messages: ChatMessageIn[]
}

// ── Lessons ──────────────────────────────────────────────────────────────────

export type LessonOut = {
  id: string
  title: string
  content: string
  grade_level?: string | null
  subject?: string | null
  duration_minutes?: number | null
  updated_at: string
}

export type LessonCreate = {
  title: string
  content?: string
  grade_level?: string | null
  subject?: string | null
  duration_minutes?: number | null
}

export type LessonUpdate = {
  title?: string
  content?: string
  grade_level?: string | null
  subject?: string | null
  duration_minutes?: number | null
}

export type LessonGenerateResult = {
  content: string
}

export type LessonEnhanceResult = {
  content: string
}

// ── Assessments ──────────────────────────────────────────────────────────────

export type AssessmentOut = {
  id: string
  title: string
  content_json: string
  subject?: string | null
  grade_level?: string | null
  updated_at: string
}

export type AssessmentCreate = {
  title: string
  content_json?: string
  subject?: string | null
  grade_level?: string | null
}

export type AssessmentUpdate = {
  title?: string
  content_json?: string
  subject?: string | null
  grade_level?: string | null
}

export type AssessmentGenerateResult = {
  content_json: string
}

// ── PD ────────────────────────────────────────────────────────────────────────

export type PDGoalOut = {
  id: string
  title: string
  category: string
  progress: number
  updated_at: string
}

export type PDGoalCreate = {
  title: string
  category?: string
  progress?: number
}

export type PDGoalUpdate = {
  title?: string
  category?: string
  progress?: number
}

export type PDReflectionOut = {
  id: string
  prompt?: string | null
  entry: string
  mood?: string | null
  created_at: string
}

export type PDReflectionCreate = {
  prompt?: string | null
  entry: string
  mood?: string | null
}

export type PDRecommendation = {
  id: string
  title: string
  platform: string
  duration: string
  relevance: number
  why: string
}
