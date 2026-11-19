import { Input } from '@/components/ui/input'
import { useNumberDraft } from './useNumberDraft'

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'min' | 'max'> & {
  value?: number
  min: number
  max: number
  onChange: (n: number | undefined | null) => void
  unit?: string
}

export function NumberField({ value, min, max, onChange, unit, ...rest }: Props) {
  const input = <Input inputMode="decimal" {...rest} {...useNumberDraft(value, min, max, onChange)} />
  if (!unit) return input
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-meta text-faint">{unit}</span>
    </div>
  )
}
