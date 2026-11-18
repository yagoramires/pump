import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const DAYS = [['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'], ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado']]
const ITEM = 'h-10 flex-1 rounded-[8px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]'

export function WeekdayChips({ label, value, onChange }: { label: string; value?: number; onChange: (d: number) => void }) {
  return (
    <div>
      <span className="label-caps mb-1.5 block tracking-[0.08em]">{label}</span>
      <ToggleGroup type="single" spacing={1} aria-label={label} value={value === undefined ? '' : String(value)} onValueChange={(v) => v && onChange(Number(v))} className="w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
        {DAYS.map(([short, full], d) => <ToggleGroupItem key={d} value={String(d)} aria-label={full} className={ITEM}>{short}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}
