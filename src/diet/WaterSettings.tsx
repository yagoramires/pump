import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatDec, parseDecimal } from '@/lib/number'
import { ML_PER_KG, WATER_LIMITS } from './water'
import { useWater } from './useWater'

export function WaterSettings() {
  const { settings, on, save, turnOn } = useWater()
  const [draft, setDraft] = useState(() => ({ goalMl: String(settings?.goalMl ?? ''), cupMl: String(settings?.cupMl ?? '') }))
  const toggle = () => {
    if (on) return save({ ...on, enabled: false })
    const next = turnOn()
    setDraft({ goalMl: String(next.goalMl), cupMl: String(next.cupMl) })
  }
  const field = (k: keyof typeof WATER_LIMITS, label: string) => {
    const [min, max] = WATER_LIMITS[k]
    const n = parseDecimal(draft[k])
    const bad = n === null || n < min || n > max
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-meta normal-case tracking-normal text-text-2">{label}</Label>
        <Input
          aria-label={label} inputMode="numeric" autoComplete="off" aria-invalid={bad} value={draft[k]}
          onChange={(e) => {
            const v = e.target.value
            setDraft((d) => ({ ...d, [k]: v }))
            const x = parseDecimal(v)
            if (on && x !== null && x >= min && x <= max) save({ ...on, [k]: Math.round(x) })
          }}
        />
        {bad && <span className="text-caption text-negative">{`Entre ${formatDec(min)} e ${formatDec(max)} ml`}</span>}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <Card className="min-h-14 flex-row items-center gap-3">
        <Label htmlFor="water-switch" className="flex-1 text-body font-semibold normal-case tracking-normal text-strong">Contador de água</Label>
        <Switch id="water-switch" checked={!!on} onCheckedChange={toggle} />
      </Card>
      {on && (
        <div className="grid grid-cols-2 gap-3">
          {field('goalMl', 'Meta (ml)')}
          {field('cupMl', 'Copo (ml)')}
        </div>
      )}
      <p className="text-meta text-text-2">{`Na primeira vez, a meta é ${ML_PER_KG} ml por kg do seu peso. Os copos aparecem na aba Dieta.`}</p>
    </div>
  )
}
