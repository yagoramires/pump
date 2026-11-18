import { formatSigned } from '@/lib/number'
import { cn } from '@/lib/utils'

export function Delta({ value, good, unit, className }: { value?: number; good: boolean; unit: string; className?: string }) {
  if (value === undefined) return <span className={cn('text-text-2', className)}>—</span>
  return <span className={cn(good ? 'text-accent' : 'text-text-2', className)}>{`${formatSigned(value)} ${unit}`}</span>
}
