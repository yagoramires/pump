import { useState } from 'react'
import { FileInput, Plus, Sparkles, Upload } from 'lucide-react'
import { DEFAULTS } from '@/schema'
import type { Exercise, WorkoutPlan } from '@/workout/types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { todayKey } from '@/lib/date'
import { plural } from '@/lib/number'
import { TEMPLATES, instantiateTemplate } from '@/workout/templates'
import { PlanEditor } from '@/workout/PlanEditor'
import { PlanImport } from '@/workout/PlanImport'
import { useWorkoutPlan } from '@/workout/useWorkoutPlan'
import { DietStart } from '@/diet/DietStart'
import { BackHeader } from '@/components/BackHeader'
import { BackupRestore } from '@/backup/BackupRestore'
import { BottomBar } from '@/components/BottomBar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AnamnesisFlow } from '@/profile/AnamnesisFlow'
import { ANAMNESIS_STEPS } from '@/profile/profile'
import { Steps } from '@/components/Steps'
import { Alert } from '@/components/ui/alert'

/** a anamnese, depois treino e dieta */
const TREINO_STEP = ANAMNESIS_STEPS + 1
const DIETA_STEP = ANAMNESIS_STEPS + 2
const ONBOARDING_STEPS = DIETA_STEP
type Step = 'anamnese' | 'treino' | 'editor' | 'ia' | 'convert' | 'dieta'

export function Onboarding() {
  const [, setSettings] = usePersisted('settings')
  const [step, setStep] = useState<Step>('anamnese')
  const [initial, setInitial] = useState<WorkoutPlan>(DEFAULTS.workoutPlan)
  const { replacePlan } = useWorkoutPlan()
  const [error, setError] = useState<string>()
  const [resumeAtDayZero, setResumeAtDayZero] = useState(false)
  const [picked, setPicked] = useState(TEMPLATES[0].id)
  const finish = () => setSettings((s) => ({ ...s, onboardingDone: true, firstUseAt: s.firstUseAt ?? todayKey() }))
  const template = TEMPLATES.find((t) => t.id === picked)!

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
  if (step === 'editor') return <PlanEditor initial={initial} onSave={(p) => { replacePlan(p); toDieta() }} onCancel={() => setStep('treino')} />
  if (step === 'ia' || step === 'convert') return <PlanImport mode={step} onDone={toDieta} onBack={() => setStep('treino')} />
  if (step === 'anamnese') {
    return (
      <AnamnesisFlow
        total={ONBOARDING_STEPS}
        resumeAtDayZero={resumeAtDayZero}
        onDone={() => setStep('treino')}
        footer={(
          <div className="flex flex-col items-center text-center">
            {/* quem instalou o app no iPhone traz aqui os dados que usava no Safari */}
            <BackupRestore trigger={(pick) => (
              <Button type="button" variant="ghost" className="text-text-2" onClick={pick}><Upload size={16} aria-hidden="true" />Restaurar backup</Button>
            )} />
          </div>
        )}
      />
    )
  }
  if (step === 'dieta') {
    return (
      <div className="flex flex-col gap-3">
        <Steps n={DIETA_STEP} total={ONBOARDING_STEPS} />
        <BackHeader title="Sua dieta" onBack={() => setStep('treino')} className="px-0 py-0" />
        <DietStart hint="A IA já recebe peso, % de gordura, massa magra, medidas e horários." onDone={finish} />
        <div className="flex justify-center"><Button type="button" variant="ghost" className="text-text-2" onClick={finish}>Pular por agora</Button></div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 pb-40">
      <Steps n={TREINO_STEP} total={ONBOARDING_STEPS} />
      <BackHeader title="Seu treino" onBack={() => { setResumeAtDayZero(true); setStep('anamnese') }} className="px-0 py-0" />
      <Card size="flush">
        <RadioGroup value={picked} onValueChange={setPicked} aria-label="Planos" className="gap-0">
          {TEMPLATES.map((t) => (
            <Label key={t.id} className={cn('min-h-14 cursor-pointer items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0', t.id === picked && 'bg-accent-bg')}>
              <RadioGroupItem value={t.id} aria-label={t.name} />
              <span className="block min-w-0 flex-1 leading-normal">
                <span className="block text-body font-semibold text-strong">{t.name}</span>
                <span className="block text-meta font-normal text-text-2">{t.description}</span>
              </span>
              <span className="text-meta font-normal text-text-2">{plural(t.workouts.length, 'treino', 'treinos')}</span>
            </Label>
          ))}
        </RadioGroup>
      </Card>
      <div className="grid grid-cols-3 gap-2.5">
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => { setInitial(DEFAULTS.workoutPlan); setStep('editor') }}><Plus size={16} aria-hidden="true" />Do zero</Button>
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('ia')}><Sparkles size={16} className="text-accent" aria-hidden="true" />Gerar com IA</Button>
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('convert')}><FileInput size={16} aria-hidden="true" />Converter</Button>
      </div>
      <BottomBar className="flex-col gap-2">
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button type="button" onClick={() => void startTemplate()}>{`Usar ${template.name}`}</Button>
        <Button type="button" variant="ghost" className="text-text-2" onClick={toDieta}>Pular por agora</Button>
      </BottomBar>
    </div>
  )
}
