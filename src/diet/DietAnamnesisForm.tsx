import type { DietAnamnesis, DietGoal, Restriction } from '../types'
import { Chips, MultiChips } from '../workout/AnamnesisForm'
import { Input } from '@/components/ui/input'

type Value = Partial<DietAnamnesis>
type EatOut = NonNullable<DietAnamnesis['eatOut']>

const LABEL = 'mb-1.5 block text-[10px] font-semibold tracking-[0.08em] text-faint uppercase'
const GOAL_LABEL: Record<DietGoal, string> = { 'perder-rapido': 'Perder rápido', perder: 'Perder peso', manter: 'Manter', ganhar: 'Ganhar peso', 'ganhar-rapido': 'Ganhar rápido' }
const MEALS: Record<string, string> = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7' }
const RESTRICTION_LABEL: Record<Restriction, string> = { lactose: 'Sem lactose', gluten: 'Sem glúten', vegetariano: 'Vegetariano', vegano: 'Vegano' }
const EAT_OUT_LABEL: Record<EatOut, string> = { casa: 'Em casa', fora: 'Fora', misto: 'Misto' }
const TIMES = [['wake', 'Acorda'], ['train', 'Treina'], ['sleep', 'Dorme']] as const
const AREA = 'w-full resize-none rounded-[11px] border border-border bg-surface p-3 text-base text-text outline-none placeholder:text-faint focus-visible:border-accent-line'

export function DietAnamnesisForm({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const set = <K extends keyof Value>(k: K, v: Value[K]) => onChange({ ...value, [k]: v })
  return (
    <section aria-labelledby="anamnese-dieta" className="flex flex-col gap-3.5 rounded-[14px] border border-border bg-panel p-3.5">
      <div>
        <h2 id="anamnese-dieta" className="text-[15px] font-semibold text-strong">Sobre sua dieta</h2>
        <p className="text-[13px] text-text-2">Só o objetivo é obrigatório; o que faltar a IA pergunta.</p>
      </div>
      <Chips label="Objetivo" options={GOAL_LABEL} value={value.goal} onChange={(v) => set('goal', v)} cols="grid-cols-2" />
      <Chips label="Refeições por dia" options={MEALS} value={value.meals ? String(value.meals) : undefined} onChange={(v) => set('meals', v ? Number(v) : undefined)} />
      <div className="grid grid-cols-3 gap-2">
        {TIMES.map(([k, label]) => (
          <div key={k}>
            <label htmlFor={`dieta-${k}`} className={LABEL}>{label}</label>
            <Input id={`dieta-${k}`} type="time" value={value[k] ?? ''} onChange={(e) => set(k, e.target.value || undefined)} />
          </div>
        ))}
      </div>
      <MultiChips label="Restrições" options={RESTRICTION_LABEL} value={value.restrictions} onChange={(v) => set('restrictions', v)} cols="grid-cols-2" />
      <div>
        <label htmlFor="dieta-avoid" className={LABEL}>Não como</label>
        <Input id="dieta-avoid" placeholder="Ex.: fígado, jiló" value={value.avoid ?? ''} onChange={(e) => set('avoid', e.target.value || undefined)} />
      </div>
      <Chips label="Onde come" options={EAT_OUT_LABEL} value={value.eatOut} onChange={(v) => set('eatOut', v)} />
      <div>
        <label htmlFor="dieta-notes" className={LABEL}>Observações</label>
        <textarea id="dieta-notes" rows={3} className={AREA} placeholder="Ex.: cole aqui a dieta do nutricionista pra transcrever" value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
      </div>
    </section>
  )
}
