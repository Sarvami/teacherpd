import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl bg-slate-900/45 px-3 text-sm text-white/90 ring-1 ring-white/10 outline-none transition',
          'placeholder:text-white/30 hover:ring-white/15 focus:ring-2 focus:ring-white/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-xl bg-slate-900/45 px-3 text-sm text-white/90 ring-1 ring-white/10 outline-none transition',
          'hover:ring-white/15 focus:ring-2 focus:ring-white/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[104px] w-full resize-y rounded-xl bg-slate-900/45 px-3 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none transition',
          'placeholder:text-white/30 hover:ring-white/15 focus:ring-2 focus:ring-white/25',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1 block text-xs font-medium text-white/70', className)}
      {...props}
    />
  )
}

export function HelpText({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-xs text-white/40', className)} {...props} />
  )
}
