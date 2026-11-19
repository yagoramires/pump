import { DIET_GOAL_LABEL, FOCUS_LABEL, type Profile } from './types'
import { Chips } from '@/components/Chips'

const HINT = 'text-caption text-faint'

export function GoalsForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Chips label="Objetivo da alimentação" options={DIET_GOAL_LABEL} cols="grid-cols-2" value={value.dietGoal} onChange={(v) => onChange({ ...value, dietGoal: v })} />
        <p className={HINT}>Define a meta de calorias e se o peso descendo é bom ou ruim na Evolução.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Chips label="Foco do treino" options={FOCUS_LABEL} cols="grid-cols-1 xs:grid-cols-3" value={value.focus} onChange={(v) => onChange({ ...value, focus: v })} />
        <p className={HINT}>Ganhar massa é o padrão, mesmo perdendo gordura na dieta.</p>
      </div>
    </div>
  )
}
