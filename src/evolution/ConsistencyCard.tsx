import { formatDec, plural } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeekBar } from './consistency'

const color = (ratio: number) => (ratio >= 1 ? 'bg-success-fg' : ratio > 0 ? 'bg-success-fg/40' : 'bg-surface')

// barras em divs: o shadcn não tem gráfico de barras
export function ConsistencyCard({ bars, avgDays, goal }: { bars: WeekBar[]; avgDays: number; goal: number }) {
  if (!bars.length) return null
  return (
    <Card size="flush">
      <CardHeader>
        <CardTitle>Constância</CardTitle>
        <CardAction className="text-meta text-text-2 tabular-nums"><b className="font-semibold text-success-fg">{formatDec(avgDays, 1)}</b> dias/sem</CardAction>
      </CardHeader>
      <div role="img" aria-label={`Treinos por semana: ${bars.map((b) => b.days).join(', ')}`} className="flex h-14 items-end gap-1 px-3.5">
        {bars.map((b) => <span key={b.start} className={cn('flex-1 rounded-sm', color(b.ratio))} style={{ height: `${Math.max(8, b.ratio * 100)}%` }} />)}
      </div>
      <div className="flex justify-between gap-2 px-3.5 pt-1 pb-3 text-caption text-faint">
        <span>{bars.length > 1 ? `${plural(bars.length - 1, 'semana', 'semanas')} atrás` : ''}</span>
        <span>{`meta: ${goal}/sem`}</span>
        <span>esta semana</span>
      </div>
    </Card>
  )
}
