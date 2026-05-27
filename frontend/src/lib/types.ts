export type TeacherCreate = {
  name: string
  age?: number | null
  gender?: string | null

  highest_qualification?: string | null
  years_of_experience?: number | null

  school?: string | null
  school_type?: 'government' | 'private' | 'aided' | null
  school_location?: 'urban' | 'semi-urban' | 'rural' | null
  state?: string | null
  district?: string | null

  subjects_taught?: string | null
  grades_taught?: string | null
  instruction_language?: string | null

  biggest_challenge?: string | null
  coaching_language?: string
}

export type TeacherOut = TeacherCreate & {
  id: number
}

export type ReflectRequest = {
  teacher_id: number
  message: string
}

export type ReflectResponse = {
  teacher_id: number
  message: string
  ai_response: string
  theme: string
  session_id: number
}

export type SessionOut = {
  id: number
  teacher_id: number
  message: string
  ai_response?: string | null
  theme?: string | null
  timestamp: string
}

export type PeerMatch = {
  teacher_id: number
  name: string
  school?: string | null
  grades_taught?: string | null
  subjects_taught?: string | null
  similarity_score: number
  reason: string
}

export type MatchResponse = {
  teacher_id: number
  matches: PeerMatch[]
}

export type HealthResponse = {
  status: 'ok' | string
  service?: string
}
