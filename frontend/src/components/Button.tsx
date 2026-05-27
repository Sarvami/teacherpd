import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  leftIcon,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium outline-none transition',
        'active:translate-y-px',
        'focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-sm',
        variant === 'primary' &&
          'bg-white text-slate-950 shadow-lg shadow-black/30 hover:bg-white/95 active:bg-white/85',
        variant === 'secondary' &&
          'bg-slate-900/55 text-slate-100 ring-1 ring-white/10 hover:bg-slate-900/70 active:bg-slate-900/80',
        variant === 'ghost' &&
          'bg-transparent text-slate-100 hover:bg-white/5 active:bg-white/10',
        variant === 'danger' &&
          'bg-rose-500/90 text-white hover:bg-rose-500 active:bg-rose-600',
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  )
}
