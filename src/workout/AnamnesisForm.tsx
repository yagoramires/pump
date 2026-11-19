import type { Anamnesis, Extra, Level, Muscle, Place, Split } from './types'
import { Chips, MultiChips } from '@/components/Chips'
import { Card } from '@/components/ui/card'
import { NumberField } from '@/components/NumberField'

const LABEL = 'label-caps mb-1.5 block tracking-[0.08em]'
const LEVEL_LABEL: Record<Level, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
const PLACE_LABEL: Record<Place, string> = { academia: 'Academia', casa: 'Em casa' }
const SPLIT_LABEL: Record<Split, string> = { fullbody: 'Full body', ab: 'AB', abc: 'ABC', abcd: 'ABCD', abcde: 'ABCDE', ppl: 'Push/\u200bPull/\u200bLegs' } // \u200b deixa quebrar na barra em tela estreita
const EXTRA_LABEL: Record<Extra, string> = { cardio: 'Cardio', abdomen: 'Abdômen', mobilidade: 'Mobilidade' }
const MUSCLE_LABEL: Record<Muscle, string> = { peito: 'Peito', costas: 'Costas', ombros: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', pernas: 'Pernas', gluteos: 'Glúteos', panturrilha: 'Panturrilha' }

export function AnamnesisForm({ value, onChange }: { value: Anamnesis; onChange: (a: Anamnesis) => void }) {
  const set = <K extends keyof Anamnesis>(k: K, v: Anamnesis[K]) => onChange({ ...value, [k]: v })
  return (
    <Card role="region" aria-labelledby="anamnese" className="gap-3.5 p-3.5">
      <div>
        <h2 id="anamnese" className="text-[15px] font-semibold text-strong">Sobre seu treino</h2>
        <p className="text-[13px] text-text-2">Opcional. Vai junto no prompt com seu perfil; o que faltar a IA pergunta.</p>
      </div>
      <Chips label="Nível" options={LEVEL_LABEL} value={value.level} onChange={(v) => set('level', v)} />
      <Chips label="Onde treina" options={PLACE_LABEL} value={value.place} onChange={(v) => set('place', v)} />
      <Chips label="Divisão preferida" options={SPLIT_LABEL} value={value.split} onChange={(v) => set('split', v)} cols="grid-cols-3" />
      <MultiChips label="Pontos fracos" options={MUSCLE_LABEL} value={value.weak} onChange={(v) => set('weak', v)} cols="grid-cols-3 min-[380px]:grid-cols-4" />
      <MultiChips label="Incluir também" options={EXTRA_LABEL} value={value.extras} onChange={(v) => set('extras', v)} />
      <div>
        <label htmlFor="tempo" className={LABEL}>Tempo por treino</label>
        <NumberField id="tempo" className="pr-12" inputMode="numeric" unit="min" min={0} max={Infinity} value={value.minutes} onChange={(n) => set('minutes', n ? Math.trunc(n) || undefined : undefined)} />
      </div>
    </Card>
  )
}
