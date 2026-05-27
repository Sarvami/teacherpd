import { AnimatePresence, motion } from 'framer-motion'
import { SendHorizonal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { Label, TextArea } from '../../components/Inputs'
import { Spinner } from '../../components/Spinner'
import type { ReflectResponse, SessionOut, TeacherOut } from '../../lib/types'

export type ChatMessage = {
  id: string
  role: 'teacher' | 'coach'
  text: string
  meta?: {
    theme?: string
    timestamp?: string
  }
}

type Props = {
  teacher: TeacherOut
  sessions?: SessionOut[]
  busy?: boolean
  onReflect: (message: string) => Promise<ReflectResponse>
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export function CoachChat({ teacher, sessions, busy, onReflect }: Props) {
  const [draft, setDraft] = useState('')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const history = useMemo<ChatMessage[]>(() => {
    const fromSessions = (sessions ?? [])
      .slice()
      .reverse()
      .slice(0, 12)
      .flatMap((s) => {
        const items: ChatMessage[] = [
          {
            id: `s_${s.id}_t`,
            role: 'teacher',
            text: s.message,
            meta: { timestamp: s.timestamp, theme: s.theme ?? undefined },
          },
        ]
        if (s.ai_response) {
          items.push({
            id: `s_${s.id}_c`,
            role: 'coach',
            text: s.ai_response,
            meta: { timestamp: s.timestamp, theme: s.theme ?? undefined },
          })
        }
        return items
      })

    return [...fromSessions, ...localMessages]
  }, [localMessages, sessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history.length, busy])

  async function submit() {
    const text = draft.trim()
    if (!text || busy) return

    setDraft('')
    const teacherMsg: ChatMessage = { id: uid(), role: 'teacher', text }
    setLocalMessages((prev) => [...prev, teacherMsg])

    try {
      const res = await onReflect(text)
      setLocalMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'coach',
          text: res.ai_response,
          meta: { theme: res.theme },
        },
      ])
    } catch (e) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'coach',
          text:
            "I couldn’t reach the AI coaching service right now. Please make sure Ollama is running, then try again.",
          meta: { theme: 'other' },
        },
      ])
    }
  }

  const canSend = draft.trim().length >= 5 && !busy

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Coaching chat</CardTitle>
          <div className="mt-1 truncate text-xs text-white/45">
            Talking as {teacher.name}
          </div>
        </div>
        <Badge tone={busy ? 'warn' : 'good'}>{busy ? 'Thinking…' : 'Ready'}</Badge>
      </CardHeader>
      <CardBody className="flex h-[calc(100%-72px)] flex-col">
        <div className="flex-1 overflow-auto pr-1">
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {history.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.16 }}
                  className={
                    m.role === 'teacher'
                      ? 'flex justify-end'
                      : 'flex justify-start'
                  }
                >
                  <div
                    className={
                      m.role === 'teacher'
                        ? 'max-w-[88%] rounded-2xl bg-white px-4 py-3 text-sm text-slate-950'
                        : 'max-w-[88%] rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10'
                    }
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.text}
                    </div>
                    {m.meta?.theme ? (
                      <div className="mt-2">
                        <Badge tone="neutral">{m.meta.theme}</Badge>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {busy ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/60 ring-1 ring-white/10">
                  <Spinner />
                  Coach is thinking…
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="reflection">Reflection</Label>
          <TextArea
            id="reflection"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What happened in class today? What did you try?"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
            }}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-white/40">
              Tip: Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
              to send
            </div>
            <Button
              variant="primary"
              onClick={submit}
              disabled={!canSend}
              leftIcon={busy ? <Spinner /> : <SendHorizonal className="h-4 w-4" />}
            >
              Send
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
