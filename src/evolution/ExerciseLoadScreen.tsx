import { useEffect, useMemo } from 'react'
import { BackHeader } from '@/components/BackHeader'
import { Overlay } from '@/components/Overlay'
import { formatDayMonth } from '@/lib/date'
import { formatKg } from '@/lib/number'
import type { WorkoutSession } from '@/workout/types'
import { MeasureValue } from './Delta'
import { LineChart } from './LineChart'
import { MODE_TEXT, exerciseLoads, type Measure } from './loads'
import type { Period } from './chart'

function Stat({ label, m, unit }: { label: string; m: Measure; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-meta text-text-2">{label}</span>
      <MeasureValue m={m} unit={unit} className="text-lg" deltaClassName="text-meta" empty={<span className="text-meta text-text-2">sem comparação</span>} />
    </div>
  )
}

export function ExerciseLoadScreen({ sessions, exerciseId, period, today, onClose }: { sessions: WorkoutSession[]; exerciseId: string; period: Period; today: string; onClose: () => void }) {
  const data = useMemo(() => exerciseLoads(sessions, exerciseId, period, today), [sessions, exerciseId, period, today])
  useEffect(() => { if (!data) onClose() }, [data, onClose])
  if (!data) return null
  const reps = data.mode === 'reps'
  const text = MODE_TEXT[data.mode]
  return (
    <Overlay>
      <BackHeader title={data.name} onBack={onClose}>
        <span className="text-meta text-text-2">{data.group.label}</span>
      </BackHeader>
      <div className="mt-3 flex justify-between gap-4">
        <Stat label={text.top} m={data.top} unit={text.unit} />
        <Stat label={text.total} m={data.total} unit={text.unit} />
      </div>
      <div className="mt-4">
        <LineChart points={data.topPoints} dashed={data.totalPoints} label="Gráfico de carga e volume" empty="Poucos registros nesse período" />
        {data.topPoints.length >= 2 && <p className="mt-1 text-center text-meta text-text-2">{`— ${text.top.toLowerCase()} · - - ${text.total.toLowerCase()}`}</p>}
      </div>
      <h2 className="mt-4 mb-1 text-sm font-semibold text-strong">Treinos</h2>
      <ul className="flex flex-col divide-y divide-line text-sm">
        {data.history.map((h) => (
          <li key={h.date} className="flex justify-between gap-3 py-2">
            <span className="text-text-2">{formatDayMonth(h.date)}</span>
            <span className="tabular-nums">{h.sets.map((s) => (reps ? s.reps : `${formatKg(s.weightKg)}×${s.reps}`)).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </Overlay>
  )
}
