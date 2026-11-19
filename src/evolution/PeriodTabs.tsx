import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Period } from './chart'

export function PeriodTabs({ value, onChange, options, label }: { value: Period; onChange: (p: Period) => void; options: readonly { v: Period; label: string }[]; label: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Period)}>
      <TabsList variant="segmented" aria-label={label} className="w-auto">
        {options.map((p) => <TabsTrigger key={p.v} variant="segmented" value={p.v}>{p.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}
