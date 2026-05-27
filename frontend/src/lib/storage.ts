const KEY = 'teacherpd:teacherId'

export function loadTeacherId(): number | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function saveTeacherId(id: number) {
  localStorage.setItem(KEY, String(id))
}

export function clearTeacherId() {
  localStorage.removeItem(KEY)
}
