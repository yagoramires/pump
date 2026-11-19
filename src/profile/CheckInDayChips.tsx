import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LABEL } from '@/components/Chips'
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/date'

const LABEL_TEXT = 'Atualizar toda semana na'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function CheckInDayChips({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{LABEL_TEXT}</span>
      <ToggleGroup type="single" variant="segmented" size="lg" spacing={1} aria-label={LABEL_TEXT} value={String(value)} onValueChange={(v) => v && onChange(Number(v))} className="grid grid-flow-col auto-cols-fr">
        {WEEKDAY_LONG.map((name, d) => <ToggleGroupItem key={d} value={String(d)} aria-label={cap(name)}>{WEEKDAY_SHORT[d][0]}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}
