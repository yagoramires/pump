import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatDayLabel } from '@/lib/date'
import { formatKg } from '@/lib/number'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { completedSessions } from './stats'
import { isCardio } from './cardio'
import { WorkoutDayLine } from './WorkoutDayLine'

export function PastWorkouts({ onClose }: { onClose: () => void }) {
  const [log] = usePersisted('workoutLog')
  const [open, setOpen] = useState<string>()
  const sessions = completedSessions(log).reverse()
  const now = new Date()
  return (
    <div>
      <BackHeader title="Treinos anteriores" onBack={onClose} />
      {sessions.length === 0 ? (
        <EmptyState icon={<History size={30} aria-hidden="true" />} title="Nenhum treino concluído ainda" />
      ) : (
        <div className="overflow-hidden card">
          {sessions.map((s) => {
            const expanded = open === s.date
            return (
              <div key={s.date} className="border-t border-line first:border-t-0">
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : s.date)} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left">
                  <span className="block min-w-0 flex-1">
                    <span className="label-caps block">{`${formatDayLabel(s.date)} · TREINO ${s.workoutLabel}`}</span>
                    <WorkoutDayLine session={s} now={now} />
                  </span>
                  <ChevronDown size={16} className={cn('text-faint transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                </button>
                {expanded && (
                  <div className="px-3.5 pb-3">
                    {s.exercises.map((e, i) => {
                      const done = e.sets.filter((d) => d !== null)
                      if (done.length === 0) return null
                      return (
                        <div key={i} className="py-1.5">
                          <div className="text-sm font-semibold text-strong">{e.name}</div>
                          {isCardio(e) ? <div className="text-[13px] text-text-2">feito</div> : done.map((d, j) => <div key={j} className="text-[13px] text-text-2 tabular-nums">{`${formatKg(d.weightKg)} kg × ${d.reps}`}</div>)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
