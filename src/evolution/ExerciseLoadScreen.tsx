import { useEffect, useMemo } from 'react'
import { BackHeader } from '@/components/BackHeader'
import { Overlay } from '@/components/Overlay'
import { formatDayMonth } from '@/lib/date'
import { formatKg } from '@/lib/number'
import type { WorkoutLog } from '@/workout/types'
import { Delta } from './Delta'
import { LoadChart } from './LoadChart'
import { exerciseLoads, type LoadMode, type LoadPeriod, type Measure } from './loads'

function Stat({ label, m, mode }: { label: string; m: Measure; mode: LoadMode }) {
  const unit = mode === 'reps' ? 'reps' : 'kg'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-meta text-faint">{label}</span>
      <b className="text-lg font-semibold tabular-nums text-strong">{`${formatKg(m.last)} ${unit}`}</b>
      {m.delta === undefined ? <span className="text-meta text-text-2">sem comparação</span> : <Delta value={m.delta} good={m.delta > 0} unit={unit} className="text-meta" />}
    </div>
  )
}

export function ExerciseLoadScreen({ log, exerciseId, period, today, onClose }: { log: WorkoutLog; exerciseId: string; period: LoadPeriod; today: string; onClose: () => void }) {
  const data = useMemo(() => exerciseLoads(log, exerciseId, period, today), [log, exerciseId, period, today])
  useEffect(() => { if (!data) onClose() }, [data, onClose])
  if (!data) return null
  const reps = data.mode === 'reps'
  return (
    <Overlay>
      <BackHeader title={data.name} onBack={onClose}>
        <span className="text-meta text-faint">{data.group.label}</span>
      </BackHeader>
      <div className="mt-3 flex justify-between gap-4">
        <Stat label={reps ? 'Máx. reps' : 'Carga máx.'} m={data.top} mode={data.mode} />
        <Stat label={reps ? 'Total de reps' : 'Volume'} m={data.total} mode={data.mode} />
      </div>
      <div className="mt-4">
        <LoadChart top={data.topPoints} total={data.totalPoints} />
        <p className="mt-1 text-center text-meta text-faint">{`— ${reps ? 'máx. reps' : 'carga máx.'} · - - ${reps ? 'total de reps' : 'volume'}`}</p>
      </div>
      <h2 className="mt-4 mb-1 text-sm font-semibold text-strong">Treinos</h2>
      <ul className="flex flex-col divide-y divide-line text-sm">
        {data.history.map((h) => (
          <li key={h.date} className="flex justify-between gap-3 py-2">
            <span className="text-text-2">{formatDayMonth(h.date)}</span>
            <span className="tabular-nums">{h.sets.map((s) => `${formatKg(s.weightKg)}×${s.reps}`).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </Overlay>
  )
}
