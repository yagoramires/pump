import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Item } from '@/components/ui/item'
import type { WorkoutSession } from '@/workout/types'
import { MeasureValue } from './Delta'
import { loadsSummary, tallyText } from './loads'
import { LOAD_PERIODS, type Period } from './chart'
import { PeriodTabs } from './PeriodTabs'
import { Sparkline } from './Sparkline'

export function RisersCard({ sessions, today, period, onPeriod, onOpen, onAll }: { sessions: WorkoutSession[]; today: string; period: Period; onPeriod: (p: Period) => void; onOpen: (exerciseId: string) => void; onAll: () => void }) {
  const { top, groups, risers } = useMemo(() => loadsSummary(sessions, period, today), [sessions, period, today])
  return (
    <Card size="flush">
      <CardHeader>
        <CardTitle>Cargas que mais subiram</CardTitle>
        <CardAction>
          <PeriodTabs value={period} onChange={onPeriod} options={LOAD_PERIODS} label="Período das cargas" />
        </CardAction>
      </CardHeader>
      {groups.length === 0 ? (
        <p className="px-3.5 pb-3.5 text-sm text-text-2">Nenhum treino com carga nesse período</p>
      ) : (
        <>
          {risers.map((r) => (
            <Item key={r.exerciseId} asChild className="h-auto w-full flex-nowrap justify-start gap-2 rounded-none border-0 border-t border-line px-3.5 py-2 text-left text-sm font-normal whitespace-normal hover:bg-transparent has-[>svg]:px-3.5">
              <Button variant="ghost" onClick={() => onOpen(r.exerciseId)}>
                <span className="min-w-0 flex-1 text-text-2">{r.name}</span>
                <Sparkline points={r.topPoints} />
                <span className="flex items-baseline gap-2 tabular-nums">
                  <MeasureValue m={r.top} unit="kg" deltaClassName="text-meta" />
                </span>
                <ChevronRight className="size-4.5 shrink-0 text-faint" aria-hidden="true" />
              </Button>
            </Item>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-line pl-3.5 pr-2 text-meta text-text-2">
            <span className="tabular-nums">{`${tallyText(top)} exercícios`}</span>
            <Button type="button" variant="link" className="text-meta text-accent" onClick={onAll}>Ver todos</Button>
          </div>
        </>
      )}
    </Card>
  )
}
