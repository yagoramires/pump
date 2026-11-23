import { Droplet, Pill, Utensils } from 'lucide-react'
import { liters } from './display'
import { BackHeader } from '@/components/BackHeader'
import { SettingsRow, type OpenView } from '@/components/SettingsSection'
import { AiPlanRows } from '@/import/AiPlanRows'
import { useDietPlan } from './useDietPlan'
import { useWater } from './useWater'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'
import { buildDietAdjustPrompt } from './prompt'
import { WaterSettings } from './WaterSettings'
import { SupplementSettings } from './SupplementSettings'
import { useSupplements } from './useSupplements'

export function DietSettings({ open }: { open: OpenView }) {
  const { plan: dietPlan, replacePlan } = useDietPlan()
  const { on } = useWater()
  const { list: supplements } = useSupplements()
  const n = supplements.length
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<Utensils size={18} aria-hidden="true" />} color="var(--c7)" title="Cardápio" onClick={() => open(<DietEditor initial={dietPlan} onSave={(next) => { replacePlan(next); back() }} onCancel={back} />)} />
      <AiPlanRows adjustPrompt={() => buildDietAdjustPrompt(dietPlan)} onImport={(mode) => open(<DietImport mode={mode} onDone={back} onBack={back} />)} />
      <SettingsRow icon={<Droplet size={18} aria-hidden="true" />} color="var(--color-info)" title="Água" sub={on ? `${liters(on.goalMl)} L por dia` : 'Desligada'} onClick={() => open(<><BackHeader title="Água" onBack={back} /><WaterSettings /></>)} />
      <SettingsRow icon={<Pill size={18} aria-hidden="true" />} color="var(--c4)" title="Suplementos" sub={n ? `${n} ${n === 1 ? 'suplemento' : 'suplementos'}` : 'Nenhum'} onClick={() => open(<SupplementSettings open={open} />)} />
    </>
  )
}
