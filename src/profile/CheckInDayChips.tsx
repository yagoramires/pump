import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LABEL } from '@/components/Chips'
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/date'

const ITEM = 'h-10 flex-1 rounded-[8px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]'
const LABEL_TEXT = 'Atualizar toda semana na'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function CheckInDayChips({ value, onChange }: { value?: number; onChange: (d: number) => void }) {
  return (
    <div>
      <span className={LABEL}>{LABEL_TEXT}</span>
      <ToggleGroup type="single" spacing={1} aria-label={LABEL_TEXT} value={value === undefined ? '' : String(value)} onValueChange={(v) => v && onChange(Number(v))} className="w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
        {WEEKDAY_LONG.map((name, d) => <ToggleGroupItem key={d} value={String(d)} aria-label={cap(name)} className={ITEM}>{WEEKDAY_SHORT[d][0]}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}
