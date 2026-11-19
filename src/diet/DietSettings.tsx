import { Droplet, FileInput, Sparkles, Utensils } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { liters } from './display'
import { activeWater } from './water'
import { BackHeader } from '@/components/BackHeader'
import { SettingsRow, type OpenView } from '@/components/SettingsSection'
import { useDietPlan } from './useDietPlan'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'
import { WaterSettings } from './WaterSettings'

export function DietSettings({ open }: { open: OpenView }) {
  const { plan: dietPlan, replacePlan } = useDietPlan()
  const [settings] = usePersisted('settings')
  const on = activeWater(settings.water)
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<Utensils size={18} aria-hidden="true" />} color="var(--c7)" title="Cardápio" onClick={() => open(<DietEditor initial={dietPlan} onSave={(next) => { replacePlan(next); back() }} onCancel={back} />)} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => open(<DietImport mode="ia" onDone={back} onBack={back} />)} />
      <SettingsRow icon={<FileInput size={18} aria-hidden="true" />} color="var(--c4)" title="Converter" onClick={() => open(<DietImport mode="convert" onDone={back} onBack={back} />)} />
      <SettingsRow icon={<Droplet size={18} aria-hidden="true" />} color="var(--c2)" title="Água" sub={on ? `${liters(on.goalMl)} L por dia` : 'Desligada'} onClick={() => open(<><BackHeader title="Água" onBack={back} /><WaterSettings /></>)} />
    </>
  )
}
