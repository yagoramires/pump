import type { ReactNode } from 'react'
import { formatKg, formatSigned } from '@/lib/number'
import { cn } from '@/lib/utils'
import type { Measure } from './loads'

export function Delta({ value, good, unit, className }: { value?: number; good: boolean; unit: string; className?: string }) {
  if (value === undefined) return <span className={cn('text-text-2', className)}>—</span>
  return <span className={cn(good ? 'text-accent' : 'text-text-2', className)}>{`${formatSigned(value)} ${unit}`}</span>
}

/** última carga e a variação (subir é bom); `empty` troca o "—" quando não há comparação */
export function MeasureValue({ m, unit, className, deltaClassName, empty }: { m: Measure; unit: string; className?: string; deltaClassName?: string; empty?: ReactNode }) {
  return (
    <>
      <b className={cn('font-semibold tabular-nums text-strong', className)}>{`${formatKg(m.last)} ${unit}`}</b>
      {m.delta === undefined && empty ? empty : <Delta value={m.delta} good={(m.delta ?? 0) > 0} unit={unit} className={deltaClassName} />}
    </>
  )
}
