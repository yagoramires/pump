import { useState } from 'react'
import { Check, ChevronDown, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatDec, formatKg } from '@/lib/number'
import type { SetDone, Workout, WorkoutLog, WorkoutSession } from './types'
import { sessionRecords, sessionStats } from './stats'
import { SessionSets } from './SessionSets'
import { DurationSheet } from './DurationSheet'
import { EffortSheet } from './EffortSheet'
import { effortLabel } from './display'
import { sessionScore, type ExerciseScore } from './score'

function Stat({ value, unit, label, onClick }: { value: string; unit?: string; label: string; onClick?: () => void }) {
  const card = (
    <Card className="flex-1 items-center gap-0.5 px-2.5 py-3 text-center">
      <div className="text-title font-bold text-strong tabular-nums">{value}{unit && <small className="ml-0.5 text-caption font-medium text-text-2">{unit}</small>}</div>
      <div className="label-caps">{label}</div>
    </Card>
  )
  return onClick ? <button type="button" onClick={onClick} className="flex flex-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent">{card}</button> : card
}

const setText = (s: SetDone) => (s.weightKg ? `${formatKg(s.weightKg)} × ${s.reps}` : s.reps)
const ARROW = { up: '↑', same: '=', down: '↓' } as Partial<Record<ExerciseScore['trend'], string>>
function rowText(r: ExerciseScore) {
  if (r.done < r.planned || !r.best) return `${r.done} de ${r.planned} séries`
  const before = r.prevBest && (r.trend === 'up' || r.trend === 'down') ? ` (antes ${setText(r.prevBest)})` : ''
  return [ARROW[r.trend], `${setText(r.best)}${before}`].filter(Boolean).join(' ')
}

export function DoneSummary({ session, log, next, onEditTimes, onEffort }: { session: WorkoutSession; log: WorkoutLog; next?: Workout; onEditTimes?: (startedAt: string, endedAt: string) => void; onEffort?: (n: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [effortOpen, setEffortOpen] = useState(false)
  const stats = sessionStats(session)
  const score = sessionScore(log, session)
  const effortText = session.effort ? `Esforço ${session.effort} · ${effortLabel(session.effort)}` : 'Sem esforço registrado'
  const records = sessionRecords(log, session)
  return (
    <>
      <Card
        className="items-center gap-3 border-accent-line px-4 py-6 text-center"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, var(--color-accent-bg) 0%, var(--color-panel) 70%)' }}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_0_0_8px_rgb(198_255_61/0.12),0_0_0_16px_rgb(198_255_61/0.05)]">
          <Check size={28} strokeWidth={3} aria-hidden="true" />
        </div>
        <div className="mt-2 text-display font-bold text-strong">Treino concluído</div>
      </Card>
      <div className="flex gap-2">
        {stats.minutes !== null && <Stat value={String(stats.minutes)} unit="min" label="Duração" onClick={onEditTimes && (() => setEditing(true))} />}
        <Stat value={String(stats.done)} label={stats.done === 1 ? 'Série' : 'Séries'} />
        <Stat value={formatDec(score.score, 1)} label="Nota" />
      </div>
      {editing && onEditTimes && <DurationSheet session={session} onSave={(s, e) => { onEditTimes(s, e); setEditing(false) }} onClose={() => setEditing(false)} />}
      {onEffort ? (
        <button type="button" onClick={() => setEffortOpen(true)} className="self-center rounded-lg px-2 py-1 text-meta text-text-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent">{effortText}</button>
      ) : <p className="text-center text-meta text-text-2">{effortText}</p>}
      {effortOpen && onEffort && <EffortSheet open value={session.effort} onPick={onEffort} onClose={() => setEffortOpen(false)} />}
      {score.rows.length > 0 && (
        <Card className="gap-0 py-0">
          <div className="py-3 text-body font-semibold text-strong tabular-nums">{`↑ ${score.up} · = ${score.same} · ↓ ${score.down}`}</div>
          {score.rows.map((r, i) => (
            <div key={i} className="flex items-baseline gap-3 border-t border-line py-2.5 text-sm">
              <span className="min-w-0 flex-1 text-strong">{r.name}</span>
              <span className="shrink-0 text-text-2 tabular-nums">{rowText(r)}</span>
            </div>
          ))}
        </Card>
      )}
      {records.length > 0 && (
        <>
          <div className="label-caps">{`Recordes · ${records.length}`}</div>
          <Card className="gap-0 py-0">
            {records.map((r) => (
              <div key={r.name} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-accent-line bg-accent-bg text-accent"><Trophy size={18} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-strong">{r.name}</div>
                  <div className="text-caption text-faint tabular-nums">{`antes ${formatKg(r.prevKg)} kg`}</div>
                </div>
                <div className="font-bold text-accent tabular-nums">{`${formatKg(r.kg)} kg`}</div>
              </div>
            ))}
          </Card>
        </>
      )}
      <Collapsible asChild>
        <Card className="gap-0 py-0">
          <CollapsibleTrigger className="group flex min-h-12 items-center justify-between gap-3 text-body font-semibold text-strong">
            Exercícios
            <ChevronDown size={18} className="text-faint transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-1.5 border-t border-line py-3"><SessionSets session={session} /></CollapsibleContent>
        </Card>
      </Collapsible>
      {next && (
        <Card className="flex-row items-center gap-3 py-3">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          <div className="text-meta text-text-2">Próximo treino<div className="text-body font-semibold text-strong">{`${next.label} · ${next.name}`}</div></div>
        </Card>
      )}
    </>
  )
}
