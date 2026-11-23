import { useState } from 'react'
import { ChevronRight, History } from 'lucide-react'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Item } from '@/components/ui/item'
import { completedSessions } from './stats'
import { workoutDayLabel } from './display'
import { WorkoutDayLine } from './WorkoutDayLine'
import { DoneSummary } from './DoneSummary'
import { useTrainingLog } from './useTrainingLog'

const key = (s: { date: string; workoutId: string }) => `${s.date}~${s.workoutId}`

export function PastWorkouts({ onClose }: { onClose: () => void }) {
  const { training: merged } = useTrainingLog()
  const [openKey, setOpenKey] = useState<string>()
  const sessions = completedSessions(merged).reverse()
  const open = sessions.find((s) => key(s) === openKey)
  if (open) {
    return (
      <div className="flex flex-col gap-3">
        <BackHeader title={open.workoutName} onBack={() => setOpenKey(undefined)} />
        <div className="label-section -mt-2">{workoutDayLabel(open.date, open.workoutLabel)}</div>
        <DoneSummary session={open} sessions={merged} />
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
            <Item key={key(s)} asChild className="h-auto min-h-14 w-full flex-nowrap justify-start gap-3 rounded-none border-0 border-t border-line px-3.5 py-2.5 text-left font-normal whitespace-normal first:border-t-0 has-[>svg]:px-3.5">
              <Button variant="ghost" onClick={() => setOpenKey(key(s))}>
                <span className="block min-w-0 flex-1">
                  <span className="label-section block">{workoutDayLabel(s.date, s.workoutLabel)}</span>
                  <WorkoutDayLine session={s} sessions={merged} />
                </span>
                <ChevronRight className="size-4.5 shrink-0 text-faint" aria-hidden="true" />
              </Button>
            </Item>
          ))}
        </Card>
      )}
    </div>
  )
}
