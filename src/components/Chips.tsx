import type { ReactNode } from 'react'
import { FieldLabel } from './FieldLabel'
import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Options<T extends string | number> = [T] extends [string] ? Record<T, string> : readonly T[]
const entries = <T extends string | number>(o: Options<T>): [T, string][] =>
  Array.isArray(o) ? o.map((v: T) => [v, String(v)]) : (Object.entries(o) as [T, string][])

type Base<T extends string | number> = { label: string; options: Options<T>; cols?: string; optional?: boolean }

function ChipsField({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel label={label} optional={optional} />
      {children}
    </div>
  )
}

const chipItems = <T extends string | number>(items: [T, string][]) => items.map(([k, text]) => <ToggleGroupItem key={k} value={String(k)}>{text}</ToggleGroupItem>)
const SHARED = { variant: 'segmented', size: 'fill', spacing: 1 } as const

export function Chips<T extends string | number>({ label, options, value, onChange, cols, optional }: Base<T> & { value?: T; onChange: (v?: T) => void }) {
  const items = entries(options)
  return (
    <ChipsField label={label} optional={optional}>
      <ToggleGroup type="single" {...SHARED} aria-label={label} value={value === undefined ? '' : String(value)} onValueChange={(v) => onChange(items.find(([k]) => String(k) === v)?.[0])} className={cn('grid', cols ?? 'grid-flow-col auto-cols-fr')}>
        {chipItems(items)}
      </ToggleGroup>
    </ChipsField>
  )
}

export function MultiChips<T extends string | number>({ label, options, value, onChange, cols, optional }: Base<T> & { value?: T[]; onChange: (v?: T[]) => void }) {
  const items = entries(options)
  return (
    <ChipsField label={label} optional={optional}>
      <ToggleGroup type="multiple" {...SHARED} aria-label={label} value={Array.isArray(value) ? value.map(String) : []} onValueChange={(v) => onChange(v.length ? v.map((s) => items.find(([k]) => String(k) === s)![0]) : undefined)} className={cn('grid', cols ?? 'grid-flow-col auto-cols-fr')}>
        {chipItems(items)}
      </ToggleGroup>
    </ChipsField>
  )
}
