import { lazy, Suspense } from 'react'
import { Droplet, Sparkles, Utensils } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { formatDec } from '@/lib/number'
import { BackHeader } from '@/components/BackHeader'
import { Loading } from '@/components/Loading'
import { SettingsRow, type OpenView } from '@/components/SettingsSection'
import { savePlan } from './plan'
import { WaterSettings } from './WaterSettings'

const DietEditor = lazy(() => import('./DietEditor').then((m) => ({ default: m.DietEditor })))
const DietImport = lazy(() => import('./DietImport').then((m) => ({ default: m.DietImport })))

export function DietSettings({ open }: { open: OpenView }) {
  const [dietPlan, setDietPlan] = usePersisted('dietPlan')
  const [settings] = usePersisted('settings')
  const on = settings.water?.enabled ? settings.water : undefined
  const back = () => open()
  return (
    <>
      <SettingsRow icon={<Utensils size={18} aria-hidden="true" />} color="var(--c7)" title="Cardápio" onClick={() => open(<Suspense fallback={<Loading />}><DietEditor initial={dietPlan} onSave={(next) => { setDietPlan((p) => savePlan(p, next)); back() }} onCancel={back} /></Suspense>)} />
      <SettingsRow icon={<Sparkles size={18} aria-hidden="true" />} color="var(--c4)" title="Gerar com IA" onClick={() => open(<Suspense fallback={<Loading />}><DietImport mode="ia" onDone={back} onBack={back} /></Suspense>)} />
      <SettingsRow icon={<Droplet size={18} aria-hidden="true" />} color="var(--c2)" title="Água" sub={on ? `${formatDec(on.goalMl / 1000)} L por dia` : 'Desligada'} onClick={() => open(<><BackHeader title="Água" onBack={back} /><WaterSettings /></>)} />
    </>
  )
}
