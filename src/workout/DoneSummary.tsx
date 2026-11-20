import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatKg, plural } from '@/lib/number'
import type { Workout, WorkoutLog, WorkoutSession } from './types'
import { sessionRecords, sessionStats, volumeChange } from './stats'
import { SessionSets } from './SessionSets'

const changeText = (pct: number, label: string) =>
  pct === 0 ? `mesmo volume do último ${label}` : `${pct > 0 ? '+' : ''}${pct}% de volume em relação ao último ${label}`

export function DoneSummary({ session, log, next }: { session: WorkoutSession; log: WorkoutLog; next?: Workout }) {
  const stats = sessionStats(session)
  const change = volumeChange(log, session)
  const records = sessionRecords(log, session)
  const line = [stats.minutes !== null && `${stats.minutes} min`, plural(stats.done, 'série', 'séries'), `${formatKg(stats.volumeKg)} kg`].filter(Boolean).join(' · ')
  return (
    <>
      <Card className="gap-1">
        <div className="flex items-center gap-2 text-body font-semibold text-strong"><Check size={18} className="text-accent" aria-hidden="true" />Treino concluído</div>
        <div className="text-meta text-text-2 tabular-nums">{line}</div>
        {change !== undefined && <div className="text-meta text-text-2 tabular-nums">{changeText(change, session.workoutLabel)}</div>}
      </Card>
      {records.length > 0 && (
        <>
          <div className="label-caps">Recordes</div>
          <Card className="gap-1.5">
            {records.map((r) => (
              <div key={r.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-strong">{r.name}</span>
                <span className="text-meta text-text-2 tabular-nums">{`${formatKg(r.kg)} kg (antes ${formatKg(r.prevKg)})`}</span>
              </div>
            ))}
          </Card>
        </>
      )}
      <div className="label-caps">Exercícios</div>
      <Card className="gap-1.5"><SessionSets session={session} /></Card>
      {next && <div className="text-meta text-text-2">{`Próximo treino: ${next.label} · ${next.name}`}</div>}
    </>
  )
}
