import { Droplet, Utensils } from 'lucide-react'
import { liters } from './display'
import { BackHeader } from '@/components/BackHeader'
import { AiPlanRows, SettingsRow, type OpenView } from '@/components/SettingsSection'
import { useDietPlan } from './useDietPlan'
import { useWater } from './useWater'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'
import { buildDietAdjustPrompt } from './prompt'
import { WaterSettings } from './WaterSettings'

export function DietSettings({ open }: { open: OpenView }) {
  const { plan: dietPlan, replacePlan } = useDietPlan()
  const { on } = useWater()
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<Utensils size={18} aria-hidden="true" />} color="var(--c7)" title="Cardápio" onClick={() => open(<DietEditor initial={dietPlan} onSave={(next) => { replacePlan(next); back() }} onCancel={back} />)} />
      <AiPlanRows adjustPrompt={() => buildDietAdjustPrompt(dietPlan)} onImport={(mode) => open(<DietImport mode={mode} onDone={back} onBack={back} />)} />
      <SettingsRow icon={<Droplet size={18} aria-hidden="true" />} color="var(--c2)" title="Água" sub={on ? `${liters(on.goalMl)} L por dia` : 'Desligada'} onClick={() => open(<><BackHeader title="Água" onBack={back} /><WaterSettings /></>)} />
    </>
  )
}
