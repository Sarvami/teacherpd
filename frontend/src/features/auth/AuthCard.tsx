import { AnimatePresence, motion } from 'framer-motion'
import {
  Eye,
  EyeOff,
  GraduationCap,
  LogIn,
  MessageSquareText,
  Shield,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/Card'
import { HelpText, Label, TextInput } from '../../components/Inputs'
import { Spinner } from '../../components/Spinner'
import { cn } from '../../lib/cn'

type Mode = 'login' | 'register'

type Props = {
  busy?: boolean
  onLogin: (payload: { email: string; password: string }) => Promise<void>
  onRegister: (payload: { name: string; email: string; password: string }) => Promise<void>
}

export function AuthCard({ busy, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem('teachup:rememberEmail')
      if (remembered) {
        setEmail(remembered)
        setRememberMe(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (mode === 'register') nameRef.current?.focus()
    else emailRef.current?.focus()
    setAttemptedSubmit(false)
  }, [mode])

  const canSubmit = useMemo(() => {
    if (busy) return false
    if (!email.trim() || !password.trim()) return false
    if (mode === 'register' && !name.trim()) return false
    return true
  }, [busy, email, password, mode, name])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setAttemptedSubmit(true)
    if (!canSubmit) return

    try {
      if (rememberMe && email.trim()) {
        window.localStorage.setItem('teachup:rememberEmail', email.trim())
      } else {
        window.localStorage.removeItem('teachup:rememberEmail')
      }
    } catch {
      // ignore
    }

    if (mode === 'login') {
      await onLogin({ email: email.trim(), password })
    } else {
      await onRegister({ name: name.trim(), email: email.trim(), password })
    }
  }

  const fieldError = useMemo(() => {
    if (!email.trim()) return 'Email is required.'
    if (!password.trim()) return 'Password is required.'
    if (mode === 'register' && !name.trim()) return 'Name is required.'
    return null
  }, [email, password, mode, name])

  function setModeSafe(next: Mode) {
    setMode(next)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-gradient-to-br from-sky-500/25 to-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-36 -right-28 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/18 to-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_60%_0%,rgba(148,163,184,0.10),rgba(15,23,42,0))]" />
        </div>

        <CardHeader className="pb-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">TeachUp</div>
            <CardTitle className="mt-1 text-base">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <div className="mt-1 text-xs text-white/50">
              {mode === 'login'
                ? 'Pick up where you left off — profile + coaching history included.'
                : 'Two minutes to personalize your coaching. No student data required.'}
            </div>
          </div>

          <div className="relative inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-xs backdrop-blur">
            <motion.div
              layout
              layoutId="authModePill"
              className={cn(
                'absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white/10 ring-1 ring-white/10',
                mode === 'login' ? 'left-1' : 'left-[calc(50%+2px)]',
              )}
              transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
            />
            <button
              type="button"
              className={cn(
                'relative z-10 rounded-full px-3 py-1 transition',
                mode === 'login' ? 'text-white' : 'text-white/60 hover:text-white',
              )}
              onClick={() => setModeSafe('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={cn(
                'relative z-10 rounded-full px-3 py-1 transition',
                mode === 'register' ? 'text-white' : 'text-white/60 hover:text-white',
              )}
              onClick={() => setModeSafe('register')}
            >
              Register
            </button>
          </div>
        </CardHeader>

        <CardBody className="pt-0">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="hidden md:col-span-5 md:block">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-10 left-10 h-44 w-44 rounded-full bg-gradient-to-br from-cyan-400/12 to-sky-500/10 blur-2xl" />
                  <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-gradient-to-tr from-violet-500/16 to-fuchsia-500/10 blur-2xl" />
                </div>

                <div className="relative">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                    AI Coaching Studio
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-white/90">
                    Plan faster. Teach calmer.
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/55">
                    TeachUp is designed for teachers who want coaching-style feedback, not generic answers.
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-white/60">
                    <div className="flex items-start gap-2 rounded-xl bg-slate-950/30 px-3 py-2 ring-1 ring-white/10">
                      <Sparkles className="mt-0.5 h-4 w-4 text-white/70" />
                      <div>
                        <div className="font-medium text-white/85">Instant lesson ideation</div>
                        <div className="mt-0.5 text-white/55">Aligned to your grade + subject.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-slate-950/30 px-3 py-2 ring-1 ring-white/10">
                      <MessageSquareText className="mt-0.5 h-4 w-4 text-white/70" />
                      <div>
                        <div className="font-medium text-white/85">Coaching-style responses</div>
                        <div className="mt-0.5 text-white/55">Clear next steps, not overwhelm.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-slate-950/30 px-3 py-2 ring-1 ring-white/10">
                      <GraduationCap className="mt-0.5 h-4 w-4 text-white/70" />
                      <div>
                        <div className="font-medium text-white/85">Profile-personalized</div>
                        <div className="mt-0.5 text-white/55">Better outputs after setup.</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-white/85">
                        <Shield className="h-4 w-4 text-white/70" />
                        Privacy-first
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-white/50">
                        No student data required.
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-white/85">
                        <Zap className="h-4 w-4 text-white/70" />
                        Streaming UX
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-white/50">
                        Fast, incremental responses.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-white/45">
                    Next: set your profile → start coaching.
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              <form onSubmit={submit} className="grid grid-cols-1 gap-4">
                {mode === 'register' ? (
                  <div className="relative">
                    <TextInput
                      id="name"
                      ref={(el) => {
                        nameRef.current = el
                      }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder=" "
                      className="peer h-12 bg-slate-950/35 pt-5"
                    />
                    <Label
                      htmlFor="name"
                      className={cn(
                        'pointer-events-none absolute left-3 top-3 origin-left text-xs text-white/55 transition',
                        'peer-placeholder-shown:top-4 peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/45',
                        'peer-focus:top-3 peer-focus:text-xs peer-focus:text-white/70',
                      )}
                    >
                      Name
                    </Label>
                    <HelpText>Required for registration.</HelpText>
                  </div>
                ) : null}

                <div className="relative">
                  <TextInput
                    id="email"
                    ref={(el) => {
                      emailRef.current = el
                    }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    autoComplete="email"
                    inputMode="email"
                    className="peer h-12 bg-slate-950/35 pt-5"
                  />
                  <Label
                    htmlFor="email"
                    className={cn(
                      'pointer-events-none absolute left-3 top-3 origin-left text-xs text-white/55 transition',
                      'peer-placeholder-shown:top-4 peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/45',
                      'peer-focus:top-3 peer-focus:text-xs peer-focus:text-white/70',
                    )}
                  >
                    Email
                  </Label>
                  <div className="mt-1 text-[11px] text-white/45">Use your work email (e.g. you@school.edu).</div>
                </div>

                <div className="relative">
                  <TextInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder=" "
                    className="peer h-12 bg-slate-950/35 pt-5 pr-10"
                  />
                  <Label
                    htmlFor="password"
                    className={cn(
                      'pointer-events-none absolute left-3 top-3 origin-left text-xs text-white/55 transition',
                      'peer-placeholder-shown:top-4 peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/45',
                      'peer-focus:top-3 peer-focus:text-xs peer-focus:text-white/70',
                    )}
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/5 hover:text-white/80"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <HelpText>
                    {mode === 'register'
                      ? 'Minimum 8 characters for registration.'
                      : 'Use your TeachUp password.'}
                  </HelpText>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember my email
                  </label>
                  <a
                    className="text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
                    href="mailto:support@teachup.local?subject=TeachUp%20Password%20Reset"
                  >
                    Forgot password?
                  </a>
                </div>

                <AnimatePresence initial={false}>
                  {attemptedSubmit && fieldError ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/90"
                    >
                      {fieldError}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-center justify-end">
                  <div className="group relative">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-r from-sky-500/25 via-violet-500/20 to-fuchsia-500/20 blur-xl opacity-0 transition group-hover:opacity-100"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      variant="primary"
                      disabled={!canSubmit}
                      className="relative"
                      leftIcon={
                        busy ? (
                          <Spinner />
                        ) : mode === 'login' ? (
                          <LogIn className="h-4 w-4" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )
                      }
                    >
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}
