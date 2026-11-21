import { useState } from 'react'
import { ChevronRight, History } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card } from '@/components/ui/card'
import { completedSessions } from './stats'
import { workoutDayLabel } from './display'
import { WorkoutDayLine } from './WorkoutDayLine'
import { DoneSummary } from './DoneSummary'
import { trainingLog } from './extra'

const key = (s: { date: string; workoutId: string }) => `${s.date}~${s.workoutId}`

export function PastWorkouts({ onClose }: { onClose: () => void }) {
  const [workoutLog] = usePersisted('workoutLog')
  const [extraLog] = usePersisted('extraLog')
  const merged = trainingLog(workoutLog, extraLog)
  const [openKey, setOpenKey] = useState<string>()
  const sessions = completedSessions(merged).reverse()
  const open = sessions.find((s) => key(s) === openKey)
  if (open) {
    return (
      <div className="flex flex-col gap-3">
        <BackHeader title={open.workoutName} onBack={() => setOpenKey(undefined)} />
        <div className="label-caps -mt-2">{workoutDayLabel(open.date, open.workoutLabel)}</div>
        <DoneSummary session={open} log={merged} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <BackHeader title="Treinos anteriores" onBack={onClose} />
      {sessions.length === 0 ? (
        <EmptyState icon={<History size={30} aria-hidden="true" />} title="Nenhum treino concluído ainda" />
      ) : (
        <Card size="flush" className="gap-0">
          {sessions.map((s) => (
            <button key={key(s)} type="button" onClick={() => setOpenKey(key(s))} className="flex min-h-14 items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0 hover:bg-hover">
              <span className="block min-w-0 flex-1">
                <span className="label-caps block">{workoutDayLabel(s.date, s.workoutLabel)}</span>
                <WorkoutDayLine session={s} />
              </span>
              <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
