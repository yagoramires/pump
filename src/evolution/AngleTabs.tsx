import type { Angle } from './types'
import { ANGLE_LABEL, ANGLES } from './types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AngleTabs({ value, onChange }: { value: Angle; onChange: (a: Angle) => void }) {
  return (
    <Tabs value={value} onValueChange={(a) => onChange(a as Angle)}>
      <TabsList aria-label="Ângulo" className="h-auto w-full group-data-[orientation=horizontal]/tabs:h-auto gap-[3px] rounded-[11px] border border-border bg-panel">
        {ANGLES.map((a) => (
          <TabsTrigger key={a} value={a} className="h-11 text-[13px] font-semibold text-text-2 data-[state=active]:bg-surface data-[state=active]:text-strong data-[state=active]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]">
            {ANGLE_LABEL[a]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
