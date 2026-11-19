import type { DietGoal, Profile } from './types'
import { Chips } from '@/components/Chips'

const DIET_GOALS: Record<DietGoal, string> = { 'perder-rapido': 'Perder rápido', perder: 'Perder peso', manter: 'Manter', ganhar: 'Ganhar peso', 'ganhar-rapido': 'Ganhar rápido' }
const FOCUS: Record<NonNullable<Profile['focus']>, string> = { hipertrofia: 'Hipertrofia', forca: 'Força', condicionamento: 'Condicionamento' }
const HINT = 'text-[12px] text-faint'

export function GoalsForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Chips label="Objetivo da alimentação" options={DIET_GOALS} cols="grid-cols-2" value={value.dietGoal} onChange={(v) => onChange({ ...value, dietGoal: v })} />
        <p className={HINT}>Define a meta de calorias e se o peso descendo é bom ou ruim na Evolução.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Chips label="Foco do treino" options={FOCUS} cols="grid-cols-3" value={value.focus} onChange={(v) => onChange({ ...value, focus: v })} />
        <p className={HINT}>Ganhar massa é o padrão, mesmo perdendo gordura na dieta.</p>
      </div>
    </div>
  )
}
