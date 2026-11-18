import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const GROUP = 'grid w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]'
const ITEM = 'h-auto min-h-9 whitespace-normal py-1 leading-tight rounded-[8px] px-1 text-[13px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]'
const LABEL = 'label-caps mb-1.5 block tracking-[0.08em]'

type Options<T extends string | number> = [T] extends [string] ? Record<T, string> : readonly T[]
const entries = <T extends string | number>(o: Options<T>): [T, string][] =>
  Array.isArray(o) ? o.map((v: T) => [v, String(v)]) : (Object.entries(o) as [T, string][])

type Base<T extends string | number> = { label: string; options: Options<T>; cols?: string }

export function Chips<T extends string | number>({ label, options, value, onChange, cols }: Base<T> & { value?: T; onChange: (v?: T) => void }) {
  const items = entries(options)
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <ToggleGroup type="single" spacing={1} aria-label={label} value={value === undefined ? '' : String(value)} onValueChange={(v) => onChange(items.find(([k]) => String(k) === v)?.[0])} className={cn(GROUP, cols ?? 'grid-flow-col auto-cols-fr')}>
        {items.map(([k, text]) => <ToggleGroupItem key={k} value={String(k)} className={ITEM}>{text}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}

export function MultiChips<T extends string | number>({ label, options, value, onChange, cols }: Base<T> & { value?: T[]; onChange: (v?: T[]) => void }) {
  const items = entries(options)
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <ToggleGroup type="multiple" spacing={1} aria-label={label} value={Array.isArray(value) ? value.map(String) : []} onValueChange={(v) => onChange(v.length ? v.map((s) => items.find(([k]) => String(k) === s)![0]) : undefined)} className={cn(GROUP, cols ?? 'grid-flow-col auto-cols-fr')}>
        {items.map(([k, text]) => <ToggleGroupItem key={k} value={String(k)} className={ITEM}>{text}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}
