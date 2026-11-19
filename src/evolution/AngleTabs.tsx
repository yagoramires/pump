import type { Angle } from './types'
import { ANGLE_LABEL, ANGLES } from './types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AngleTabs({ value, onChange }: { value: Angle; onChange: (a: Angle) => void }) {
  return (
    <Tabs value={value} onValueChange={(a) => onChange(a as Angle)}>
      <TabsList variant="segmented" aria-label="Ângulo">
        {ANGLES.map((a) => <TabsTrigger key={a} variant="segmented" value={a}>{ANGLE_LABEL[a]}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}
