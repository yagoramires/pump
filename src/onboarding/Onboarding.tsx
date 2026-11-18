import { useState } from 'react'
import { Plus, Sparkles, Upload } from 'lucide-react'
import { DEFAULTS } from '@/schema'
import type { Exercise, WorkoutPlan } from '@/workout/types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { todayKey } from '@/lib/date'
import { plural } from '@/lib/number'
import { TEMPLATES, instantiateTemplate } from '@/workout/templates'
import { PlanEditor } from '@/workout/PlanEditor'
import { PlanImport } from '@/workout/PlanImport'
import { DietStart } from '@/diet/DietStart'
import { BackHeader } from '@/components/BackHeader'
import { useImportBackup } from '@/shell/useImportBackup'
import { BottomBar } from '@/components/BottomBar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ANAMNESIS_STEPS, AnamnesisFlow } from '@/profile/AnamnesisFlow'
import { Steps } from '@/components/Steps'

const ONBOARDING_STEPS = ANAMNESIS_STEPS + 2
type Step = 'anamnese' | 'treino' | 'editor' | 'import' | 'dieta'

function StepHeader({ n, onSkip }: { n: number; onSkip: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1"><Steps n={n} total={ONBOARDING_STEPS} /></div>
      <Button type="button" variant="ghost" className="-mt-2 text-text-2" onClick={onSkip}>Pular por agora</Button>
    </div>
  )
}

export function Onboarding() {
  const [, setSettings] = usePersisted('settings')
  const [step, setStep] = useState<Step>('anamnese')
  const [initial, setInitial] = useState<WorkoutPlan>(DEFAULTS.workoutPlan)
  const [, setPlan] = usePersisted('workoutPlan')
  const [error, setError] = useState<string>()
  const [anamneseStep, setAnamneseStep] = useState(0)
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
  if (step === 'anamnese') {
    return (
      <AnamnesisFlow
        total={ONBOARDING_STEPS}
        step={anamneseStep}
        onDone={() => setStep('treino')}
        footer={(
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
        <StepHeader n={ANAMNESIS_STEPS + 2} onSkip={finish} />
        <BackHeader title="Sua dieta" onBack={() => setStep('treino')} className="mb-3 px-0 py-0" />
        <DietStart hint="A IA já recebe peso, % de gordura, massa magra, medidas e horários." onDone={finish} />
      </div>
    )
  }
  return (
    <div className="pb-28">
      <StepHeader n={ANAMNESIS_STEPS + 1} onSkip={toDieta} />
      <BackHeader title="Seu treino" onBack={() => { setAnamneseStep(2); setStep('anamnese') }} className="mb-3 px-0 py-0" />
      <div role="radiogroup" aria-label="Planos" className="overflow-hidden card">
        {TEMPLATES.map((t) => {
          const on = t.id === picked
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} aria-label={t.name} onClick={() => setPicked(t.id)} className={cn('flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0', on && 'bg-accent-bg')}>
              <span className="block min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-strong">{t.name}</span>
                <span className="block text-[13px] text-text-2">{t.description}</span>
              </span>
              <span className="text-[13px] text-text-2">{plural(t.workouts.length, 'treino', 'treinos')}</span>
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
