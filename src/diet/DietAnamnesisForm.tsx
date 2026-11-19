import type { DietAnamnesis } from './types'
import { EAT_OUT_FORM, RESTRICTIONS } from './anamnesisLabels'
import { Chips, MultiChips } from '@/components/Chips'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Value = DietAnamnesis

const MEALS = [3, 4, 5, 6, 7]

export function DietAnamnesisForm({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const set = <K extends keyof Value>(k: K, v: Value[K]) => onChange({ ...value, [k]: v })
  return (
    <Card role="region" aria-labelledby="anamnese-dieta" className="gap-3">
      <div>
        <h2 id="anamnese-dieta" className="text-body font-semibold text-strong">Sobre sua dieta</h2>
        <p className="text-meta text-text-2">Opcional. O que faltar a IA pergunta.</p>
      </div>
      <Chips label="Refeições por dia" options={MEALS} value={value.meals} onChange={(v) => set('meals', v)} />
      <MultiChips label="Restrições" options={RESTRICTIONS} value={value.restrictions} onChange={(v) => set('restrictions', v)} cols="grid-cols-2" />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dieta-avoid" className="label-caps-wide">Não como</Label>
        <Input id="dieta-avoid" placeholder="Ex.: fígado, jiló" value={value.avoid ?? ''} onChange={(e) => set('avoid', e.target.value || undefined)} />
      </div>
      <Chips label="Onde come" options={EAT_OUT_FORM} value={value.eatOut} onChange={(v) => set('eatOut', v)} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dieta-notes" className="label-caps-wide">Observações</Label>
        <Textarea id="dieta-notes" rows={3} placeholder="Ex.: cole aqui a dieta do nutricionista pra transcrever" value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </div>
    </Card>
  )
}
