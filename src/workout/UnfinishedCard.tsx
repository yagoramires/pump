import { toast } from 'sonner'
import type { WorkoutLog, WorkoutSession } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDayLabel, parseDayKey } from '@/lib/date'
import { completeSession } from './session'

type SetLog = (f: (prev: WorkoutLog) => WorkoutLog) => unknown

/** treino de um dia anterior com série marcada que ficou sem concluir */
export function UnfinishedCard({ session, setLog }: { session: WorkoutSession; setLog: SetLog }) {
  const { date } = session
  const conclude = () => {
    const end = parseDayKey(date)
    end.setHours(23, 59)
    setLog((prev) => {
      if (!prev[date]) return prev
      const { startedAt: _s, ...rest } = prev[date]
      return { ...prev, [date]: completeSession(rest, end) }
    })
    toast('Treino concluído', { action: { label: 'Desfazer', onClick: () => setLog((prev) => ({ ...prev, [date]: session })) } })
  }
  const discard = () => {
    setLog(({ [date]: _gone, ...others }) => others)
    toast('Treino descartado', { action: { label: 'Desfazer', onClick: () => setLog((prev) => ({ ...prev, [date]: session })) } })
  }
  return (
    <Card className="gap-2.5">
      <p className="text-body font-semibold text-strong">{`Treino ${session.workoutLabel} de ${formatDayLabel(date)} ficou sem concluir`}</p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={conclude}>Concluir</Button>
        <Button variant="outline" className="flex-1" onClick={discard}>Descartar</Button>
      </div>
    </Card>
  )
}
