import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export type ToastItem = {
  id: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
  title: string
  message?: string
}

type Props = {
  items: ToastItem[]
  onDismiss: (id: string) => void
}

export function Toasts({ items, onDismiss }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex w-full max-w-3xl flex-col gap-2 px-3">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl px-4 py-3 ring-1 backdrop-blur',
              t.tone === 'good' && 'bg-emerald-500/10 text-emerald-50 ring-emerald-300/20',
              t.tone === 'warn' && 'bg-amber-500/10 text-amber-50 ring-amber-300/20',
              t.tone === 'bad' && 'bg-rose-500/10 text-rose-50 ring-rose-300/20',
              (!t.tone || t.tone === 'neutral') && 'bg-slate-950/50 text-white ring-white/10',
            )}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.message ? (
                <div className="mt-0.5 text-xs text-white/70">{t.message}</div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-xl p-0"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
