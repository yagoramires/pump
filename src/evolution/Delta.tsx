import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { isGood, type Metric } from './bodyFat'

/** diferença com sinal, verde quando anda na direção do objetivo */
export function Delta({ d, unit, metric, dir, className }: { d?: number; unit: string; metric: Metric; dir: 'gain' | 'loss'; className?: string }) {
  if (d === undefined) return <span className={cn('text-text-2', className)}>—</span>
  const r = Math.round(d * 10) / 10
  return <span className={cn(r !== 0 && isGood(metric, dir, r) ? 'text-accent' : 'text-text-2', className)}>{`${r < 0 ? '−' : r > 0 ? '+' : ''}${formatDec(Math.abs(r))} ${unit}`}</span>
}
