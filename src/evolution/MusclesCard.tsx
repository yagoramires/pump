import type { CSSProperties } from 'react'
import { plural } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LazyBodyMap } from '@/workout/LazyBodyMap'
import type { muscleSummary, GroupSets } from './muscleSets'

const text = (g: GroupSets) => (g.status === 'trained' ? `${plural(g.perWeek, 'série', 'séries')}/sem` : g.status === 'auxiliary' ? 'só como auxiliar' : 'parado')

export function MusclesCard({ summary }: { summary: NonNullable<ReturnType<typeof muscleSummary>> }) {
  const max = Math.max(0, ...summary.groups.map((g) => g.perWeek))
  return (
    <Card size="flush">
      <CardHeader>
        <CardTitle>Músculos treinados</CardTitle>
        <CardAction className="text-meta text-text-2">30 dias</CardAction>
      </CardHeader>
      <div className="min-h-72 px-3.5"><LazyBodyMap levels={summary.levels} /></div>
      <div className="flex flex-col gap-2 px-3.5 pt-2 pb-3.5 text-sm">
        {summary.groups.map((g) => (
          <div key={g.token} className={cn('grid grid-cols-[5.5rem_1fr_auto] items-center gap-3', g.status !== 'trained' && 'text-text-2')}>
            <span>{g.label}</span>
            {/* o Progress fixa bg-primary no indicador: a cor do grupo entra por variável */}
            <Progress value={max > 0 ? (g.perWeek / max) * 100 : 0} aria-label={`${g.label}: ${text(g)}`} className="h-1.5 bg-surface [&>[data-slot=progress-indicator]]:bg-(--bar)" style={{ '--bar': `var(--${g.token})` } as CSSProperties} />
            <span className="text-meta tabular-nums">{text(g)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
