import { useState } from 'react'
import { History } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatKg } from '@/lib/number'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card } from '@/components/ui/card'
import { completedSessions } from './stats'
import { isCardio } from './cardio'
import { workoutDayLabel } from './display'
import { markedSets } from './session'
import { WorkoutDayLine } from './WorkoutDayLine'

export function PastWorkouts({ onClose }: { onClose: () => void }) {
  const [log] = usePersisted('workoutLog')
  const [open, setOpen] = useState<string>()
  const sessions = completedSessions(log).reverse()
  return (
    <div className="flex flex-col gap-3">
      <BackHeader title="Treinos anteriores" onBack={onClose} />
      {sessions.length === 0 ? (
        <EmptyState icon={<History size={30} aria-hidden="true" />} title="Nenhum treino concluído ainda" />
      ) : (
        <Card size="flush">
          <Accordion type="single" collapsible value={open ?? ''} onValueChange={(v) => setOpen(v || undefined)}>
            {sessions.map((s) => (
              <AccordionItem key={s.date} value={s.date} className="border-line">
                <AccordionTrigger className="min-h-14 items-center gap-3 rounded-none px-3.5 py-2.5 font-normal hover:no-underline [&>svg]:translate-y-0 [&>svg]:text-faint">
                  <span className="block min-w-0 flex-1">
                    <span className="label-caps block">{workoutDayLabel(s.date, s.workoutLabel)}</span>
                    <WorkoutDayLine session={s} now={new Date(s.completedAt!)} />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-1.5 px-3.5 pb-3">
                  {s.exercises.map((e, i) => {
                    const done = markedSets(e)
                    if (done.length === 0) return null
                    return (
                      <div key={i}>
                        <div className="text-sm font-semibold text-strong">{e.name}</div>
                        {isCardio(e) ? <div className="text-meta text-text-2">feito</div> : done.map((d, j) => <div key={j} className="text-meta text-text-2 tabular-nums">{`${formatKg(d.weightKg)} kg × ${d.reps}`}</div>)}
                      </div>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}
    </div>
  )
}
