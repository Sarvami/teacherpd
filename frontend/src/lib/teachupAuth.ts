import type { AuthUser } from './teachupTypes'

const TOKEN_KEY = 'teachup:accessToken'
const USER_KEY = 'teachup:user'

export function loadAccessToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  const token = raw?.trim() || ''
  return token ? token : null
}

export function saveAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function loadUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function saveUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearAuth() {
  clearAccessToken()
  clearUser()
}
