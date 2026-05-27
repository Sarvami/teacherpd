import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type Tone = 'neutral' | 'good' | 'warn' | 'bad'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
}

export function Badge({ className, tone = 'neutral', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1',
        tone === 'neutral' && 'bg-white/5 text-white/70 ring-white/10',
        tone === 'good' && 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20',
        tone === 'warn' && 'bg-amber-400/10 text-amber-200 ring-amber-300/20',
        tone === 'bad' && 'bg-rose-400/10 text-rose-200 ring-rose-300/20',
        className,
      )}
      {...props}
    />
  )
}
