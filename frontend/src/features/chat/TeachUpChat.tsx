import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCcw, SendHorizonal, Sparkles, StopCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { Label, TextArea } from '../../components/Inputs'
import { Spinner } from '../../components/Spinner'
import { streamChat } from '../../lib/teachupApi'
import type { ChatMessageIn, SSEEvent, StreamingChatRequest } from '../../lib/teachupTypes'

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

type Props = {
  teacherName: string
  systemContext?: StreamingChatRequest['systemContext']
}

export function TeachUpChat({ teacherName, systemContext = 'general' }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const storageKey = `upteach:draft:${systemContext}`
  const [draft, setDraft] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) || ''
    } catch {
      return ''
    }
  })
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const canSend = useMemo(() => draft.trim().length >= 2 && !busy, [draft, busy])

  const examplePrompts = useMemo(
    () => [
      'Create a 40-minute lesson plan for tomorrow.',
      'Generate 5 exit-ticket questions with answer key.',
      'Help me respond to a student who is disengaged.',
    ],
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, busy])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, draft)
    } catch {
      // ignore
    }
  }, [draft, storageKey])

  function resetConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setConversationId(null)
    setMessages([])
    textareaRef.current?.focus()
  }

  async function submit() {
    const text = draft.trim()
    if (!text || busy) return

    setDraft('')
    setBusy(true)

    const userId = `u_${uid()}`
    const assistantId = `a_${uid()}`

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '' },
    ])

    const payload: StreamingChatRequest = {
      conversationId,
      systemContext,
      messages: [
        ...messages.map<ChatMessageIn>((m) => ({ id: m.id, role: m.role, content: m.content })),
        { id: userId, role: 'user', content: text },
      ],
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const applyEvent = (ev: SSEEvent) => {
      if (ev.type === 'start') {
        setConversationId(ev.conversationId)
        return
      }
      if (ev.type === 'token') {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + ev.value } : m)),
        )
        return
      }
      if (ev.type === 'error') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: ev.message || 'The AI coaching service is unavailable.',
                }
              : m,
          ),
        )
        return
      }
      if (ev.type === 'done') {
        setConversationId(ev.conversationId)
      }
    }

    try {
      await streamChat(payload, applyEvent, ac.signal)
    } catch (e) {
      const msg = (e as Error).message || 'The AI coaching service is unavailable.'
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)),
      )
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4 text-white/80" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">AI Coaching Studio</CardTitle>
              <div className="mt-0.5 truncate text-xs text-white/45">Coaching as {teacherName}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={resetConversation}
            disabled={busy && messages.length === 0}
            leftIcon={<RefreshCcw className="h-4 w-4" />}
            title="Start a new conversation"
          >
            New
          </Button>
          <Badge tone={busy ? 'warn' : 'good'}>{busy ? 'Streaming…' : 'Ready'}</Badge>
        </div>
      </CardHeader>

      <CardBody className="flex h-[calc(100%-72px)] flex-col gap-4">
        <div className="flex-1 overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center py-8">
              <div className="w-full max-w-xl">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-semibold text-white/90">Start with a strong prompt</div>
                  <div className="mt-1 text-xs text-white/45">
                    Try one of these — then iterate with quick follow-ups.
                  </div>
                  <div className="mt-4 grid gap-2">
                    {examplePrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDraft(p)}
                        className="rounded-xl bg-slate-950/30 px-4 py-3 text-left text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-slate-950/40 hover:text-white"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.16 }}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div className={m.role === 'user' ? 'flex max-w-[92%] items-end gap-2' : 'flex max-w-[92%] items-end gap-2'}>
                      {m.role === 'assistant' ? (
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                          AI
                        </div>
                      ) : null}

                      <div
                        className={
                          m.role === 'user'
                            ? 'rounded-2xl bg-white px-4 py-3 text-sm text-slate-950 shadow-lg shadow-black/20'
                            : 'rounded-2xl bg-slate-900/35 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10'
                        }
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {m.content || (m.role === 'assistant' && busy ? '…' : '')}
                        </div>
                      </div>

                      {m.role === 'user' ? (
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                          {teacherName.trim().slice(0, 1).toUpperCase() || 'U'}
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
                    Generating…
                  </div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="prompt">Message</Label>
          <TextArea
            id="prompt"
            ref={(el) => {
              textareaRef.current = el
            }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask for a lesson idea, assessment questions, or coaching advice…"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
            }}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-white/40">
              Tip: Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
            </div>
            <div className="flex items-center gap-2">
              {busy ? (
                <Button variant="ghost" onClick={stop} leftIcon={<StopCircle className="h-4 w-4" />}>
                  Stop
                </Button>
              ) : null}
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
        </div>
      </CardBody>
    </Card>
  )
}
