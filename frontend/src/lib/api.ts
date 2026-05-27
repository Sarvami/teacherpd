type ApiErrorShape = {
  detail?: string
}

const DEFAULT_BASE = ''

function getBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (envBase && envBase.trim()) || DEFAULT_BASE
}

export class ApiError extends Error {
  status: number
  payload?: unknown

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getBaseUrl()
  const url = `${base}${path}`

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...init.headers,
  }

  if (init.body && !('Content-Type' in (headers as Record<string, string>))) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined)

  if (!res.ok) {
    const detail = (payload as ApiErrorShape | undefined)?.detail
    throw new ApiError(detail || `Request failed (${res.status})`, res.status, payload)
  }

  return payload as T
}
