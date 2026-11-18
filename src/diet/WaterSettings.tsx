import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatDec, parseDecimal } from '@/lib/number'
import { cn } from '@/lib/utils'
import { ML_PER_KG, WATER_LIMITS } from './water'
import { useWater } from './useWater'

/** Configurações > Água: liga/desliga, meta e copo */
export function WaterSettings() {
  const { settings, on, save, turnOn } = useWater()
  // o texto digitado fica mesmo inválido (mostra "Entre X e Y ml"); só o válido é gravado
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
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-2">{label}</span>
        <Input
          aria-label={label} inputMode="numeric" autoComplete="off" aria-invalid={bad} value={draft[k]}
          onChange={(e) => {
            const v = e.target.value
            setDraft((d) => ({ ...d, [k]: v }))
            const x = parseDecimal(v)
            if (on && x !== null && x >= min && x <= max) save({ ...on, [k]: Math.round(x) })
          }}
        />
        {bad && <span className="text-[12.5px] text-negative">{`Entre ${formatDec(min)} e ${formatDec(max)} ml`}</span>}
      </label>
    )
  }
  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
        <button type="button" role="switch" aria-checked={!!on} onClick={toggle} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left">
          <span className="flex-1 text-[15px] font-semibold text-strong">Contador de água</span>
          <span aria-hidden="true" className={cn('relative h-8 w-13 shrink-0 rounded-full border transition-colors', on ? 'border-accent bg-accent' : 'border-border bg-surface')}>
            <span className={cn('absolute top-0.5 left-0.5 size-6 rounded-full transition-transform', on ? 'translate-x-5 bg-on-accent' : 'bg-text-2')} />
          </span>
        </button>
      </div>
      {on && (
        <div className="grid grid-cols-2 gap-3">
          {field('goalMl', 'Meta (ml)')}
          {field('cupMl', 'Copo (ml)')}
        </div>
      )}
      <p className="text-[13px] text-text-2">{`Na primeira vez, a meta é ${ML_PER_KG} ml por kg do seu peso. Os copos aparecem na aba Dieta.`}</p>
    </div>
  )
}
