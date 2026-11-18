import { useState } from 'react'
import { Plus, Sparkles, Upload, Utensils } from 'lucide-react'
import { DEFAULTS } from '@/schema'
import type { Exercise, WorkoutPlan } from '@/workout/types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { WEEK_ORDER, todayKey } from '@/lib/date'
import { TEMPLATES, instantiateTemplate } from '@/workout/templates'
import { PlanEditor } from '@/workout/PlanEditor'
import { PlanImport } from '@/workout/PlanImport'
import { DietEditor } from '@/diet/DietEditor'
import { DietImport } from '@/diet/DietImport'
import { savePlan } from '@/diet/plan'
import { Overlay } from '@/components/Overlay'
import { EmptyState } from '@/components/EmptyState'
import { BackHeader } from '@/components/BackHeader'
import { useImportBackup } from '@/shell/useImportBackup'
import { BottomBar } from '@/components/BottomBar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AnamnesisFlow } from './AnamnesisFlow'
import { Steps } from './Steps'

type Step = 'anamnese' | 'treino' | 'editor' | 'import' | 'dieta' | 'dieta-editor' | 'dieta-ia' | 'dieta-import'

export function Onboarding() {
  const [, setSettings] = usePersisted('settings')
  const [step, setStep] = useState<Step>('anamnese')
  const [initial, setInitial] = useState<WorkoutPlan>(DEFAULTS.workoutPlan)
  const [, setPlan] = usePersisted('workoutPlan')
  const [dietPlan, setDietPlan] = usePersisted('dietPlan')
  const [error, setError] = useState<string>()
  const [picked, setPicked] = useState(TEMPLATES[0].id)
  const finish = () => setSettings((s) => ({ ...s, onboardingDone: true, firstUseAt: s.firstUseAt ?? todayKey() }))
  const template = TEMPLATES.find((t) => t.id === picked)!
  const backup = useImportBackup()

  const startTemplate = async () => {
    setError(undefined)
    let catalog: Exercise[]
    try {
      catalog = await fetchExercises()
    } catch {
      setError('Sem internet pra carregar o modelo. Monte do zero com seus exercícios ou tente de novo')
      return
    }
    setInitial(instantiateTemplate(template, catalog))
    setStep('editor')
  }

  const toDieta = () => setStep('dieta')
  if (step === 'editor') return <PlanEditor initial={initial} onSave={(p) => { setPlan(p); toDieta() }} onCancel={() => setStep('treino')} />
  if (step === 'import') return <PlanImport onDone={toDieta} onBack={() => setStep('treino')} />
  if (step === 'dieta-editor') return <Overlay><DietEditor initial={dietPlan} onSave={(next) => { setDietPlan((p) => savePlan(p, next)); finish() }} onCancel={() => setStep('dieta')} /></Overlay>
  if (step === 'dieta-ia' || step === 'dieta-import') return <Overlay><DietImport mode={step === 'dieta-ia' ? 'ia' : 'import'} onDone={finish} onBack={() => setStep('dieta')} /></Overlay>
  if (step === 'anamnese') {
    return (
      <AnamnesisFlow
        total={5}
        onDone={() => setStep('treino')}
        first={(
          <div className="-mt-2">
            {/* quem instalou o app no iPhone traz aqui os dados que usava no Safari */}
            <Button type="button" variant="ghost" className="text-text-2" onClick={backup.pick}><Upload size={16} aria-hidden="true" />Restaurar backup</Button>
            {backup.input}
            {backup.error && <p role="alert" className="px-3.5 py-2 text-sm text-negative">{backup.error}</p>}
            {backup.confirm}
          </div>
        )}
      />
    )
  }
  if (step === 'dieta') {
    return (
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1"><Steps n={5} total={5} /></div>
          <Button type="button" variant="ghost" className="-mt-2 text-text-2" onClick={finish}>Pular por agora</Button>
        </div>
        <h1 className="mb-3 text-[26px] font-bold tracking-tight text-strong">Sua dieta</h1>
        <EmptyState icon={<Utensils size={30} aria-hidden="true" />} title="Monte seu cardápio">
          <p className="max-w-[240px] text-sm text-text-2">A IA já recebe peso, % de gordura, massa magra, medidas e horários.</p>
          <Button className="mt-3 w-full max-w-xs" onClick={() => setStep('dieta-ia')}><Sparkles aria-hidden="true" />Gerar com IA</Button>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('dieta-editor')}><Plus aria-hidden="true" />Do zero</Button>
            <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('dieta-import')}><Upload aria-hidden="true" />Importar</Button>
          </div>
        </EmptyState>
      </div>
    )
  }
  return (
    <div className="pb-28">
      <div className="flex items-start justify-between">
        <div className="flex-1"><Steps n={4} total={5} /></div>
        <Button type="button" variant="ghost" className="-mt-2 text-text-2" onClick={toDieta}>Pular por agora</Button>
      </div>
      <BackHeader title="Seu treino" onBack={() => setStep('anamnese')} className="mb-3 px-0 py-0" />
      <div role="radiogroup" aria-label="Planos" className="overflow-hidden card">
        {TEMPLATES.map((t) => {
          const days = new Set(t.workouts.flatMap((w) => w.weekdays))
          const on = t.id === picked
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} aria-label={t.name} onClick={() => setPicked(t.id)} className={cn('flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0', on && 'bg-accent-bg')}>
              <span className="block min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-strong">{t.name}</span>
                <span className="block text-[13px] text-text-2">{t.description}</span>
              </span>
              <span className="flex gap-1" aria-hidden="true">
                {WEEK_ORDER.map((d) => <span key={d} className={cn('size-1.5 rounded-full', days.has(d) ? 'bg-accent' : 'bg-border-strong')} />)}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => { setInitial(DEFAULTS.workoutPlan); setStep('editor') }}><Plus size={16} aria-hidden="true" />Do zero</Button>
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('import')}><Sparkles size={16} className="text-accent" aria-hidden="true" />Importar de IA</Button>
      </div>
      <BottomBar className="flex-col gap-2">
        {error && <p role="alert" className="rounded-[10px] border border-border bg-panel px-3 py-2 text-sm text-negative">{error}</p>}
        <Button type="button" onClick={() => void startTemplate()}>{`Usar ${template.name}`}</Button>
      </BottomBar>
    </div>
  )
}
