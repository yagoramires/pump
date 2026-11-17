import type { MeasureFields } from '../types'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'

export type Metric = keyof MeasureFields | 'fat'
// o que melhora ao subir (gain) ou ao descer (loss); o resto fica neutro. Gordura descendo é sempre bom
const GOOD: Record<'gain' | 'loss', Metric[]> = { gain: ['weightKg', 'armCm', 'chestCm', 'thighCm'], loss: ['weightKg', 'waistCm', 'hipCm'] }
const isGood = (m: Metric, dir: 'gain' | 'loss', v: number) => (m === 'fat' ? v < 0 : v > 0 ? dir === 'gain' && GOOD.gain.includes(m) : dir === 'loss' && GOOD.loss.includes(m))

/** diferença com sinal, verde quando anda na direção do objetivo */
export function Delta({ d, unit, metric, dir, className }: { d?: number; unit: string; metric: Metric; dir: 'gain' | 'loss'; className?: string }) {
  if (d === undefined) return <span className={cn('text-text-2', className)}>—</span>
  const r = Math.round(d * 10) / 10
  return <span className={cn(r !== 0 && isGood(metric, dir, r) ? 'text-accent' : 'text-text-2', className)}>{`${r < 0 ? '−' : r > 0 ? '+' : ''}${formatDec(Math.abs(r))} ${unit}`}</span>
}
