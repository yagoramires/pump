import { toast } from 'sonner'
import type { WorkoutLog, WorkoutSession } from './types'
import { Button } from '@/components/ui/button'
import { formatDayLabel } from '@/lib/date'

type SetLog = (f: (prev: WorkoutLog) => WorkoutLog) => unknown

/** treino de um dia anterior com série marcada que ficou sem concluir */
export function UnfinishedCard({ session, setLog }: { session: WorkoutSession; setLog: SetLog }) {
  const { date } = session
  const conclude = () => {
    const [y, m, d] = date.split('-').map(Number)
    setLog((prev) => {
      const { startedAt: _s, ...rest } = prev[date]
      return { ...prev, [date]: { ...rest, completedAt: new Date(y, m - 1, d, 23, 59).toISOString(), restEndsAt: undefined } }
    })
  }
  const discard = () => {
    setLog(({ [date]: _gone, ...others }) => others)
    toast('Treino descartado', { action: { label: 'Desfazer', onClick: () => setLog((prev) => ({ ...prev, [date]: session })) } })
  }
  return (
    <div className="mb-3 clear-right card p-3.5">
      <p className="text-[14px] font-semibold text-strong">{`Treino ${session.workoutLabel} de ${formatDayLabel(date)} ficou sem concluir`}</p>
      <div className="mt-2.5 flex gap-2">
        <Button className="h-10 flex-1 rounded-[13px]" onClick={conclude}>Concluir</Button>
        <Button variant="outline" className="h-10 flex-1 rounded-[13px]" onClick={discard}>Descartar</Button>
      </div>
    </div>
  )
}
