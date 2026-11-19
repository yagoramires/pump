import { FileInput, List, Sparkles } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { SettingsRow, type OpenView } from '@/components/SettingsSection'
import { PlanEditor } from './PlanEditor'
import { PlanImport } from './PlanImport'

export function WorkoutSettings({ open }: { open: OpenView }) {
  const [workoutPlan, setWorkoutPlan] = usePersisted('workoutPlan')
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<List size={18} aria-hidden="true" />} color="var(--c1)" title="Editar plano" onClick={() => open(<PlanEditor initial={workoutPlan} onSave={(p) => { setWorkoutPlan(p); back() }} onCancel={back} />)} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => open(<PlanImport mode="ia" onDone={back} onBack={back} />)} />
      <SettingsRow icon={<FileInput size={18} aria-hidden="true" />} color="var(--c4)" title="Converter" onClick={() => open(<PlanImport mode="convert" onDone={back} onBack={back} />)} />
    </>
  )
}
