import type { DietAnamnesis, Restriction } from './types'
import { Chips, MultiChips } from '@/components/Chips'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Value = DietAnamnesis
type EatOut = NonNullable<DietAnamnesis['eatOut']>

const LABEL = 'label-caps mb-1.5 block tracking-[0.08em]'
const MEALS = [3, 4, 5, 6, 7]
const RESTRICTION_LABEL: Record<Restriction, string> = { lactose: 'Sem lactose', gluten: 'Sem glúten', vegetariano: 'Vegetariano', vegano: 'Vegano' }
const EAT_OUT_LABEL: Record<EatOut, string> = { casa: 'Em casa', fora: 'Fora', misto: 'Misto' }

export function DietAnamnesisForm({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const set = <K extends keyof Value>(k: K, v: Value[K]) => onChange({ ...value, [k]: v })
  return (
    <section aria-labelledby="anamnese-dieta" className="flex flex-col gap-3.5 card p-3.5">
      <div>
        <h2 id="anamnese-dieta" className="text-[15px] font-semibold text-strong">Sobre sua dieta</h2>
        <p className="text-[13px] text-text-2">Opcional. O que faltar a IA pergunta.</p>
      </div>
      <Chips label="Refeições por dia" options={MEALS} value={value.meals} onChange={(v) => set('meals', v)} />
      <MultiChips label="Restrições" options={RESTRICTION_LABEL} value={value.restrictions} onChange={(v) => set('restrictions', v)} cols="grid-cols-2" />
      <div>
        <Label htmlFor="dieta-avoid" className={LABEL}>Não como</Label>
        <Input id="dieta-avoid" placeholder="Ex.: fígado, jiló" value={value.avoid ?? ''} onChange={(e) => set('avoid', e.target.value || undefined)} />
      </div>
      <Chips label="Onde come" options={EAT_OUT_LABEL} value={value.eatOut} onChange={(v) => set('eatOut', v)} />
      <div>
        <Label htmlFor="dieta-notes" className={LABEL}>Observações</Label>
        <Textarea id="dieta-notes" rows={3} placeholder="Ex.: cole aqui a dieta do nutricionista pra transcrever" value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </div>
    </section>
  )
}
