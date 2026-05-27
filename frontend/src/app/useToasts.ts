import { useCallback, useMemo, useRef, useState } from 'react'
import type { ToastItem } from '../components/Toast'

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'> & { ttlMs?: number }) => {
      const id = uid()
      const ttlMs = toast.ttlMs ?? 4500
      const item: ToastItem = {
        id,
        tone: toast.tone,
        title: toast.title,
        message: toast.message,
      }
      setItems((prev) => [item, ...prev].slice(0, 4))
      const timer = window.setTimeout(() => dismiss(id), ttlMs)
      timers.current.set(id, timer)
      return id
    },
    [dismiss],
  )

  return useMemo(() => ({ items, push, dismiss }), [dismiss, items, push])
}
