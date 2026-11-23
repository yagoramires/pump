import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Item } from '@/components/ui/item'
import type { WorkoutSession } from '@/workout/types'
import { MeasureValue } from './Delta'
import { MODE_TEXT, loadsSummary, tallyText, type LoadRow, type Measure } from './loads'
import { LOAD_PERIODS, type Period } from './chart'
import { PeriodTabs } from './PeriodTabs'

function Value({ m, row }: { m: Measure; row: LoadRow }) {
  const { unit } = MODE_TEXT[row.mode]
  return (
    <span className="tabular-nums">
      <MeasureValue m={m} unit={unit} deltaClassName="ml-2 text-meta" />
    </span>
  )
}

export function LoadsCard({ sessions, today, period, onPeriod, onOpen }: { sessions: WorkoutSession[]; today: string; period: Period; onPeriod: (p: Period) => void; onOpen: (exerciseId: string) => void }) {
  const { top, total, groups } = useMemo(() => loadsSummary(sessions, period, today), [sessions, period, today])
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
            <div className="flex justify-between"><span>{MODE_TEXT.load.top}</span><span className="tabular-nums">{tallyText(top)}</span></div>
            <div className="flex justify-between"><span>{MODE_TEXT.load.total}</span><span className="tabular-nums">{tallyText(total)}</span></div>
          </div>
          {groups.map((g) => (
            <div key={g.token}>
              <div className="flex items-center gap-2 border-t border-line px-3.5 pt-2.5 pb-1 text-meta text-faint">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: `var(--${g.token})` }} />
                {g.label}
              </div>
              {g.rows.map((r) => (
                <Item key={r.exerciseId} asChild className="h-auto w-full flex-nowrap justify-start gap-2 rounded-none border-0 px-3.5 py-2 text-left text-sm font-normal whitespace-normal hover:bg-transparent has-[>svg]:px-3.5">
                  <Button variant="ghost" onClick={() => onOpen(r.exerciseId)}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-3"><span className="text-text-2">{r.name}</span><Value m={r.top} row={r} /></span>
                    <span className="flex items-center justify-between gap-3 text-meta text-faint"><span>{MODE_TEXT[r.mode].total}</span><Value m={r.total} row={r} /></span>
                    </span>
                    <ChevronRight className="size-4.5 shrink-0 text-faint" aria-hidden="true" />
                  </Button>
                </Item>
              ))}
            </div>
          ))}
        </>
      )}
    </Card>
  )
}
