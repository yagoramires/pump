import type { WorkoutSession } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDayLabel } from '@/lib/date'

export function UnfinishedCard({ session, onConclude, onDiscard }: {
  session: WorkoutSession
  onConclude: () => void
  onDiscard: () => void
}) {
  return (
    <Card className="gap-2.5">
      <p className="text-body font-semibold text-strong">{`Treino ${session.workoutLabel} de ${formatDayLabel(session.date)} ficou sem concluir`}</p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onConclude}>Concluir</Button>
        <Button variant="outline" className="flex-1" onClick={onDiscard}>Descartar</Button>
      </div>
    </Card>
  )
}
