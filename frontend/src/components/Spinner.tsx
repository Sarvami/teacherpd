import { cn } from '../lib/cn'

type Props = {
  className?: string
}

export function Spinner({ className }: Props) {
  return (
    <div
      className={cn(
        'h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white/80',
        className,
      )}
      aria-label="Loading"
      role="status"
    />
  )
}
