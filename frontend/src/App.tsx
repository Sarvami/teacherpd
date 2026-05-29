import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogOut, MessageSquare, PencilLine, Users } from 'lucide-react'
import { Toasts } from './components/Toast'
import { apiFetch } from './lib/api'
import { useToasts } from './app/useToasts'
import { AuthCard } from './features/auth/AuthCard'
import { TeachUpChat } from './features/chat/TeachUpChat'
import { InsightsPanel } from './features/insights/InsightsPanel'
import { ProfileSetupCard } from './features/profile/ProfileSetupCard'
import { clearAuth, loadAccessToken, loadUser, saveAccessToken, saveUser } from './lib/teachupAuth'
import { getProfile, login, logout, me, putProfile, register } from './lib/teachupApi'
import type { ProfileOut } from './lib/teachupTypes'
import type { HealthResponse, MatchResponse, SessionOut, TeacherOut } from './lib/types'
import { Button } from './components/Button'
import { Badge } from './components/Badge'
import { cn } from './lib/cn'

type HealthState = 'ok' | 'down' | 'unknown'
type Tab = 'chat' | 'peers'

export default function App() {
  const appName = 'UpTeach'
  const toasts = useToasts()

  const reduceMotion = useReducedMotion()
  const bgX = useMotionValue(30)
  const bgY = useMotionValue(10)
  const bgXSpring = useSpring(bgX, { stiffness: 80, damping: 22, mass: 0.25 })
  const bgYSpring = useSpring(bgY, { stiffness: 80, damping: 22, mass: 0.25 })
  const glowA = useMotionTemplate`radial-gradient(60% 45% at ${bgXSpring}% ${bgYSpring}%, rgba(255,255,255,0.11), rgba(15,23,42,0))`

  const [health, setHealth] = useState<HealthState>('unknown')
  const [busyAuth, setBusyAuth] = useState(false)
  const [busyProfile, setBusyProfile] = useState(false)

  const [authedUser, setAuthedUser] = useState(() => loadUser())
  const [accessToken, setAccessToken] = useState(() => loadAccessToken())
  const [profile, setProfile] = useState<ProfileOut | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  // Peers & History state
  const [sessions, setSessions] = useState<SessionOut[] | undefined>(undefined)
  const [matches, setMatches] = useState<MatchResponse | null>(null)
  const [busyInsights, setBusyInsights] = useState(false)

  const anyBusy = busyAuth || busyProfile

  // ── Auth init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function init() {
      const token = loadAccessToken()
      if (!token) return
      try {
        const u = await me()
        if (!alive) return
        setAuthedUser(u)
        saveUser(u)
        setAccessToken(token)
        try {
          const p = await getProfile()
          if (!alive) return
          setProfile(p)
        } catch {
          // new user — no profile yet
        }
      } catch {
        clearAuth()
        if (!alive) return
        setAuthedUser(null)
        setAccessToken(null)
        setProfile(null)
        setEditingProfile(false)
      }
    }
    void init()
    return () => { alive = false }
  }, [])

  // ── Health polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const res = await apiFetch<HealthResponse>('/health')
        if (!alive) return
        setHealth(res.status === 'ok' ? 'ok' : 'down')
      } catch {
        if (!alive) return
        setHealth('down')
      }
    }
    void tick()
    const id = window.setInterval(tick, 7000)
    return () => { alive = false; window.clearInterval(id) }
  }, [])

  // ── Document title ─────────────────────────────────────────────────────────
  const title = useMemo(
    () => (authedUser ? `${appName} • ${authedUser.name}` : appName),
    [appName, authedUser],
  )
  useEffect(() => { document.title = title }, [title])

  // ── Insights (peers + sessions) ────────────────────────────────────────────
  async function loadInsights(teacherId: number) {
    setBusyInsights(true)
    try {
      const [sessRes, matchRes] = await Promise.allSettled([
        apiFetch<SessionOut[]>(`/sessions/${teacherId}?limit=20`),
        apiFetch<MatchResponse>(`/match-peer/${teacherId}?top_n=5`),
      ])
      setSessions(sessRes.status === 'fulfilled' ? sessRes.value : [])
      setMatches(matchRes.status === 'fulfilled' ? matchRes.value : null)
    } finally {
      setBusyInsights(false)
    }
  }

  // Load insights automatically when the Peers tab is first opened
  const peersTabOpened = activeTab === 'peers' && profile
  useEffect(() => {
    if (peersTabOpened && sessions === undefined && !busyInsights) {
      void loadInsights(profile!.teacher_id)
    }
  }, [peersTabOpened])

  // ── Auth handlers ──────────────────────────────────────────────────────────
  async function handleLogin(payload: { email: string; password: string }) {
    setBusyAuth(true)
    try {
      const res = await login(payload)
      saveAccessToken(res.token)
      saveUser(res.user)
      setAccessToken(res.token)
      setAuthedUser(res.user)
      toasts.push({ tone: 'good', title: 'Signed in', message: `Welcome back, ${res.user.name}.` })
      try {
        const p = await getProfile()
        setProfile(p)
      } catch {
        setProfile(null)
      }
    } catch (e) {
      toasts.push({ tone: 'bad', title: 'Sign in failed', message: (e as Error).message })
      throw e
    } finally {
      setBusyAuth(false)
    }
  }

  async function handleRegister(payload: { name: string; email: string; password: string }) {
    setBusyAuth(true)
    try {
      const res = await register(payload)
      saveAccessToken(res.token)
      saveUser(res.user)
      setAccessToken(res.token)
      setAuthedUser(res.user)
      toasts.push({ tone: 'good', title: 'Account created', message: `Welcome, ${res.user.name}.` })
      setProfile(null)
    } catch (e) {
      toasts.push({ tone: 'bad', title: 'Registration failed', message: (e as Error).message })
      throw e
    } finally {
      setBusyAuth(false)
    }
  }

  async function handleSaveProfile(payload: Parameters<typeof putProfile>[0]) {
    setBusyProfile(true)
    try {
      const p = await putProfile(payload)
      setProfile(p)
      setEditingProfile(false)
      toasts.push({ tone: 'good', title: 'Profile saved', message: `All set, ${p.name}.` })
      return p
    } catch (e) {
      toasts.push({ tone: 'bad', title: 'Could not save profile', message: (e as Error).message })
      throw e
    } finally {
      setBusyProfile(false)
    }
  }

  async function handleLogout() {
    try { await logout() } catch { /* best-effort */ }
    clearAuth()
    setAuthedUser(null)
    setAccessToken(null)
    setProfile(null)
    setEditingProfile(false)
    setSessions(undefined)
    setMatches(null)
    setActiveTab('chat')
    toasts.push({ tone: 'neutral', title: 'Signed out', message: 'See you next time.' })
  }

  // ── Pointer glow ───────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return
      bgX.set(Math.max(0, Math.min(100, (e.clientX / (window.innerWidth || 1)) * 100)))
      bgY.set(Math.max(0, Math.min(100, (e.clientY / (window.innerHeight || 1)) * 100)))
    },
    [bgX, bgY, reduceMotion],
  )
  const handlePointerLeave = useCallback(() => {
    if (reduceMotion) return
    bgX.set(30); bgY.set(10)
  }, [bgX, bgY, reduceMotion])

  // ── Derived ────────────────────────────────────────────────────────────────
  const healthText =
    health === 'ok' ? 'API online'
    : health === 'down' ? 'API offline — start the backend'
    : 'Checking API…'

  const healthDotClass =
    health === 'ok' ? 'bg-emerald-400/90'
    : health === 'down' ? 'bg-rose-400/90'
    : 'bg-amber-300/90'

  // Build a TeacherOut-shaped object from the logged-in profile for InsightsPanel
  const teacherOut: TeacherOut | null = profile
    ? {
        id: profile.teacher_id,
        name: profile.name,
        grades_taught: profile.grades_taught ?? undefined,
        subjects_taught: profile.subjects_taught ?? undefined,
        school: profile.school ?? undefined,
        years_of_experience: profile.years_of_experience ?? undefined,
      }
    : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-50"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Background glow */}
      <motion.div className="pointer-events-none fixed inset-0" style={{ background: glowA }} />
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-sky-500/18 to-violet-500/14 blur-3xl" />
        <div className="absolute -bottom-64 left-[30%] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-fuchsia-500/12 to-cyan-400/10 blur-3xl" />
        <div className="absolute -right-56 top-10 h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-indigo-500/14 to-slate-500/0 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_0%,rgba(148,163,184,0.10),rgba(15,23,42,0))]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <Toasts items={toasts.items} onDismiss={toasts.dismiss} />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
              {appName}
            </div>
            <div className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Teacher coaching that feels instant.
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              Structured prompts, streaming responses, and a profile that personalizes everything.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* API health pill */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: 0.06 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur"
            >
              <motion.span
                aria-hidden
                className={`h-2 w-2 rounded-full ${healthDotClass}`}
                animate={
                  reduceMotion ? undefined
                  : health === 'unknown' ? { opacity: [0.25, 0.8, 0.25], scale: [1, 1.25, 1] }
                  : health === 'down' ? { opacity: [0.25, 0.35, 0.25] }
                  : { opacity: 0.75 }
                }
                transition={
                  reduceMotion ? undefined
                  : { duration: health === 'unknown' ? 1.2 : 2.0, repeat: health !== 'ok' ? Infinity : 0, ease: 'easeInOut' }
                }
              />
              <span>{healthText}</span>
            </motion.div>

            {authedUser && accessToken ? (
              <div className="flex items-center gap-2">
                <Badge tone="neutral" className="hidden md:inline-flex">
                  {authedUser.name}
                </Badge>
                {profile ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingProfile(true)}
                    leftIcon={<PencilLine className="h-4 w-4" />}
                  >
                    Edit profile
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Sign out
                </Button>
              </div>
            ) : null}
          </div>
        </motion.header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <motion.main
          key={authedUser ? (profile && !editingProfile ? 'app' : 'setup') : 'auth'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
        >
          {/* Not logged in */}
          {!authedUser || !accessToken ? (
            <div className="mx-auto w-full max-w-5xl">
              <AuthCard busy={busyAuth} onLogin={handleLogin} onRegister={handleRegister} />
            </div>

          /* Profile setup / edit */
          ) : !profile || editingProfile ? (
            <div className="mx-auto w-full max-w-4xl">
              <ProfileSetupCard
                busy={busyProfile}
                initialName={authedUser.name}
                initialProfile={editingProfile ? profile : null}
                onSave={handleSaveProfile}
                onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
                mode={editingProfile ? 'edit' : 'onboarding'}
              />
            </div>

          /* Main app — tabbed layout */
          ) : (
            <div className="flex flex-col gap-4">

              {/* Profile summary bar */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white/80 ring-1 ring-white/10">
                    {profile.name.trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/90">{profile.name}</div>
                    <div className="mt-0.5 truncate text-xs text-white/45">
                      {[profile.grades_taught, profile.subjects_taught].filter(Boolean).join(' · ') || 'No grades or subjects set'}
                    </div>
                  </div>
                </div>
                {profile.school ? (
                  <div className="hidden text-xs text-white/40 sm:block">{profile.school}</div>
                ) : null}
              </div>

              {/* Tab bar */}
              <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur">
                <TabButton
                  active={activeTab === 'chat'}
                  onClick={() => setActiveTab('chat')}
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="AI Coaching Studio"
                />
                <TabButton
                  active={activeTab === 'peers'}
                  onClick={() => setActiveTab('peers')}
                  icon={<Users className="h-4 w-4" />}
                  label="Peers & History"
                  badge={matches?.matches?.length}
                />
              </div>

              {/* Tab panels */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'chat' ? (
                  <TeachUpChat teacherName={profile.name} systemContext="general" />
                ) : teacherOut ? (
                  <InsightsPanel
                    teacher={teacherOut}
                    sessions={sessions}
                    matches={matches}
                    busy={busyInsights}
                    onRefresh={() => loadInsights(profile.teacher_id)}
                  />
                ) : null}
              </motion.div>

            </div>
          )}
        </motion.main>

        <footer className="pt-2 text-center text-xs text-white/35">
          {anyBusy ? 'Working…' : 'Ready.'} • Dev proxy:{' '}
          <span className="font-mono">/api → {import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}</span>
        </footer>
      </div>
    </div>
  )
}

// ── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
        active
          ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/15'
          : 'text-white/50 hover:bg-white/5 hover:text-white/75',
      )}
    >
      {icon}
      <span>{label}</span>
      {badge != null && badge > 0 ? (
        <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
