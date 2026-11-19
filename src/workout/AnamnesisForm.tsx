import type { Anamnesis } from './types'
import { EXTRA_LABEL, LEVEL_LABEL, MUSCLE_LABEL, PLACE_LABEL, SPLIT_LABEL } from './anamnesis'
import { Chips, MultiChips } from '@/components/Chips'
import { Card } from '@/components/ui/card'
import { NumberField } from '@/components/NumberField'
import { FieldLabel } from '@/components/FieldLabel'

// \u200b deixa o chip quebrar na barra
const SPLIT_CHIPS = { ...SPLIT_LABEL, ppl: SPLIT_LABEL.ppl.replaceAll('/', '/\u200b') }

export function AnamnesisForm({ value, onChange }: { value: Anamnesis; onChange: (a: Anamnesis) => void }) {
  const set = <K extends keyof Anamnesis>(k: K, v: Anamnesis[K]) => onChange({ ...value, [k]: v })
  return (
    <Card role="region" aria-labelledby="anamnese" className="gap-3.5">
      <div>
        <h2 id="anamnese" className="text-body font-semibold text-strong">Sobre seu treino</h2>
        <p className="text-meta text-text-2">Opcional. Vai junto no prompt com seu perfil; o que faltar a IA pergunta.</p>
      </div>
      <Chips label="Nível" options={LEVEL_LABEL} value={value.level} onChange={(v) => set('level', v)} />
      <Chips label="Onde treina" options={PLACE_LABEL} value={value.place} onChange={(v) => set('place', v)} />
      <Chips label="Divisão preferida" options={SPLIT_CHIPS} value={value.split} onChange={(v) => set('split', v)} cols="grid-cols-3" />
      <MultiChips label="Pontos fracos" options={MUSCLE_LABEL} value={value.weak} onChange={(v) => set('weak', v)} cols="grid-cols-3 xs:grid-cols-4" />
      <MultiChips label="Incluir também" options={EXTRA_LABEL} value={value.extras} onChange={(v) => set('extras', v)} />
      <div className="flex flex-col gap-1.5">
        <FieldLabel label="Tempo por treino" htmlFor="tempo" />
        <NumberField id="tempo" className="pr-12" inputMode="numeric" unit="min" min={0} max={Infinity} value={value.minutes} onChange={(n) => set('minutes', n ? Math.trunc(n) || undefined : undefined)} />
      </div>
    </Card>
  )
}
