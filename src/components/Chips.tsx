import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export const LABEL = 'label-caps tracking-[0.08em]'

type Options<T extends string | number> = [T] extends [string] ? Record<T, string> : readonly T[]
const entries = <T extends string | number>(o: Options<T>): [T, string][] =>
  Array.isArray(o) ? o.map((v: T) => [v, String(v)]) : (Object.entries(o) as [T, string][])

type Base<T extends string | number> = { label: string; options: Options<T>; cols?: string }

export function Chips<T extends string | number>({ label, options, value, onChange, cols }: Base<T> & { value?: T; onChange: (v?: T) => void }) {
  const items = entries(options)
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <ToggleGroup type="single" variant="segmented" size="fill" spacing={1} aria-label={label} value={value === undefined ? '' : String(value)} onValueChange={(v) => onChange(items.find(([k]) => String(k) === v)?.[0])} className={cols ?? 'grid grid-flow-col auto-cols-fr'}>
        {items.map(([k, text]) => <ToggleGroupItem key={k} value={String(k)}>{text}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}

export function MultiChips<T extends string | number>({ label, options, value, onChange, cols }: Base<T> & { value?: T[]; onChange: (v?: T[]) => void }) {
  const items = entries(options)
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <ToggleGroup type="multiple" variant="segmented" size="fill" spacing={1} aria-label={label} value={Array.isArray(value) ? value.map(String) : []} onValueChange={(v) => onChange(v.length ? v.map((s) => items.find(([k]) => String(k) === s)![0]) : undefined)} className={cols ?? 'grid grid-flow-col auto-cols-fr'}>
        {items.map(([k, text]) => <ToggleGroupItem key={k} value={String(k)}>{text}</ToggleGroupItem>)}
      </ToggleGroup>
    </div>
  )
}
