import { List } from 'lucide-react'
import { AiPlanRows, SettingsRow, type OpenView } from '@/components/SettingsSection'
import { PlanEditor } from './PlanEditor'
import { PlanImport } from './PlanImport'
import { buildAdjustPrompt } from './prompt'
import { useWorkoutPlan } from './useWorkoutPlan'

export function WorkoutSettings({ open }: { open: OpenView }) {
  const { plan, replacePlan } = useWorkoutPlan()
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<List size={18} aria-hidden="true" />} color="var(--c1)" title="Editar plano" onClick={() => open(<PlanEditor initial={plan} onSave={(p) => { replacePlan(p); back() }} onCancel={back} />)} />
      <AiPlanRows adjustPrompt={() => buildAdjustPrompt(plan)} onImport={(mode) => open(<PlanImport mode={mode} onDone={back} onBack={back} />)} />
    </>
  )
}
