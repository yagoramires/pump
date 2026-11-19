import { useState } from 'react'
import { History } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { BackHeader } from '@/components/BackHeader'
import { EmptyState } from '@/components/EmptyState'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card } from '@/components/ui/card'
import { completedSessions } from './stats'
import { workoutDayLabel } from './display'
import { WorkoutDayLine } from './WorkoutDayLine'
import { SessionSets } from './SessionSets'

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
                    <WorkoutDayLine session={s} />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-1.5 px-3.5 pb-3">
                  <SessionSets session={s} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}
    </div>
  )
}
