import type { ReactNode } from 'react'
import { Check, ChevronDown, Dumbbell } from 'lucide-react'
import type { SessionExercise } from './types'
import { IconDot } from '@/components/IconDot'
import { muscleColor } from '../catalog/muscles'
import { formatKg } from '@/lib/number'
import { cn } from '@/lib/utils'

type Props = { ex: SessionExercise; open: boolean; onToggle: () => void; onPreview: () => void; children?: ReactNode }

export function ExerciseCard({ ex, open, onToggle, onPreview, children }: Props) {
  const done = ex.sets.filter(Boolean).length
  const complete = done === ex.sets.length
  const sub = open
    ? [ex.muscles[0], `descanso ${ex.restSec} s`].filter(Boolean).join(' · ')
    : `${ex.sets.length} × ${ex.reps} · ${formatKg(ex.weightKg)} kg`
  return (
    <div className={cn('mb-2.5 overflow-hidden rounded-[14px] border bg-panel', open ? 'border-accent-line' : 'border-border')}>
      <div className="flex items-center pl-1.5 pr-3">
        <button type="button" aria-label={`Ver ${ex.name}`} onClick={onPreview} className="flex size-11 shrink-0 items-center justify-center">
          <IconDot color={muscleColor(ex.muscles)} size={32}><Dumbbell size={16} aria-hidden="true" /></IconDot>
        </button>
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-2.5 pl-1.5 text-left">
          <span className="block min-w-0 flex-1">
            <span className="block text-[15px] font-semibold break-words text-strong">{ex.name}</span>
            <span className="mt-px block text-[13px] text-text-2 first-letter:uppercase">{sub}</span>
          </span>
          <span className={cn('flex shrink-0 items-center gap-1.5 text-[13px] tabular-nums', complete ? 'text-accent' : 'text-faint')}>
            {done}/{ex.sets.length}
            {complete ? <Check size={14} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />}
          </span>
        </button>
      </div>
      {open && children}
    </div>
  )
}
