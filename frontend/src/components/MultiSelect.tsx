/**
 * MultiSelect — a pill-based tag picker.
 *
 * Renders a grid of toggleable option pills. Selected values are stored as a
 * sorted, comma-separated string (e.g. "Grade 1, Grade 5") so they drop
 * straight into the existing DB columns without any schema change.
 */
import { cn } from '../lib/cn'

type Props = {
  /** All available options to display as pills */
  options: string[]
  /** Current selection as a comma-separated string (matches DB format) */
  value: string
  /** Called with the new comma-separated string whenever selection changes */
  onChange: (value: string) => void
  className?: string
}

function parseValue(v: string): Set<string> {
  return new Set(
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function serializeValue(set: Set<string>, options: string[]): string {
  // Keep values in the same order as the options list for consistency
  return options.filter((o) => set.has(o)).join(', ')
}

export function MultiSelect({ options, value, onChange, className }: Props) {
  const selected = parseValue(value)

  function toggle(option: string) {
    const next = new Set(selected)
    if (next.has(option)) {
      next.delete(option)
    } else {
      next.add(option)
    }
    onChange(serializeValue(next, options))
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = selected.has(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            aria-pressed={active}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition select-none',
              active
                ? 'bg-white text-slate-950 ring-white'
                : 'bg-white/5 text-white/60 ring-white/10 hover:bg-white/10 hover:text-white/80',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
