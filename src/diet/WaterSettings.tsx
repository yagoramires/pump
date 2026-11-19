import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNumberDraft } from '@/components/useNumberDraft'
import { formatDec } from '@/lib/number'
import type { WaterSettings as Water } from './types'
import { ML_PER_KG } from './water'
import { WATER_LIMITS } from './limits'
import { useWater } from './useWater'

function WaterField({ on, k, label, save }: { on: Water; k: keyof typeof WATER_LIMITS; label: string; save: (w: Water) => void }) {
  const [min, max] = WATER_LIMITS[k]
  const draft = useNumberDraft(on[k], min, max, (n) => typeof n === 'number' && save({ ...on, [k]: Math.round(n) }))
  const bad = !draft.value.trim() || !!draft['aria-invalid']
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-meta normal-case tracking-normal text-text-2">{label}</Label>
      <Input aria-label={label} inputMode="numeric" autoComplete="off" {...draft} aria-invalid={bad} />
      {bad && <span className="text-caption text-negative">{`Entre ${formatDec(min)} e ${formatDec(max)} ml`}</span>}
    </div>
  )
}

export function WaterSettings() {
  const { on, save, turnOn } = useWater()
  return (
    <div className="flex flex-col gap-3">
      <Card className="min-h-14 flex-row items-center gap-3">
        <Label htmlFor="water-switch" className="flex-1 text-body font-semibold normal-case tracking-normal text-strong">Contador de água</Label>
        <Switch id="water-switch" checked={!!on} onCheckedChange={() => (on ? save({ ...on, enabled: false }) : turnOn())} />
      </Card>
      {on && (
        <div className="grid grid-cols-2 gap-3">
          <WaterField on={on} k="goalMl" label="Meta (ml)" save={save} />
          <WaterField on={on} k="cupMl" label="Copo (ml)" save={save} />
        </div>
      )}
      <p className="text-meta text-text-2">{`Na primeira vez, a meta é ${ML_PER_KG} ml por kg do seu peso. Os copos aparecem na aba Dieta.`}</p>
    </div>
  )
}
