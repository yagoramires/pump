import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKg } from '@/lib/number'
import type { WorkoutLog } from '@/workout/types'
import { Delta } from './Delta'
import { MODE_TEXT, loadsSummary, type LoadRow, type Measure, type Tally } from './loads'
import { PERIODS, type Period } from './chart'
import { PeriodTabs } from './PeriodTabs'

const LOAD_PERIODS = PERIODS.filter((p) => p.v !== '7')
const tally = (t: Tally) => `↑ ${t.up} · ↓ ${t.down} · = ${t.same}`

function Value({ m, row }: { m: Measure; row: LoadRow }) {
  const { unit } = MODE_TEXT[row.mode]
  return (
    <span className="tabular-nums">
      <b className="font-semibold text-strong">{`${formatKg(m.last)} ${unit}`}</b>
      <Delta value={m.delta} good={(m.delta ?? 0) > 0} unit={unit} className="ml-2 text-meta" />
    </span>
  )
}

export function LoadsCard({ log, today, period, onPeriod, onOpen }: { log: WorkoutLog; today: string; period: Period; onPeriod: (p: Period) => void; onOpen: (exerciseId: string) => void }) {
  const { top, total, groups } = useMemo(() => loadsSummary(log, period, today), [log, period, today])
  return (
    <Card size="flush">
      <CardHeader>
        <CardTitle>Cargas</CardTitle>
        <CardAction>
          <PeriodTabs value={period} onChange={onPeriod} options={LOAD_PERIODS} label="Período das cargas" />
        </CardAction>
      </CardHeader>
      {groups.length === 0 ? (
        <p className="px-3.5 pb-3.5 text-sm text-text-2">Nenhum treino com carga nesse período</p>
      ) : (
        <>
          <div className="flex flex-col gap-1 px-3.5 pb-3 text-sm text-text-2">
            <div className="flex justify-between"><span>Carga máx.</span><span className="tabular-nums">{tally(top)}</span></div>
            <div className="flex justify-between"><span>Volume</span><span className="tabular-nums">{tally(total)}</span></div>
          </div>
          {groups.map((g) => (
            <div key={g.token}>
              <div className="flex items-center gap-2 border-t border-line px-3.5 pt-2.5 pb-1 text-meta text-faint">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: `var(--${g.token})` }} />
                {g.label}
              </div>
              {g.rows.map((r) => (
                <button key={r.exerciseId} type="button" onClick={() => onOpen(r.exerciseId)} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-3"><span className="text-text-2">{r.name}</span><Value m={r.top} row={r} /></span>
                  <span className="flex items-center justify-between gap-3 text-meta text-faint"><span>{MODE_TEXT[r.mode].total}</span><Value m={r.total} row={r} /></span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
                </button>
              ))}
            </div>
          ))}
        </>
      )}
    </Card>
  )
}
