import { useState } from 'react'
import { Plus, Sparkles, Upload } from 'lucide-react'
import { DEFAULTS, type Settings } from '@/schema'
import type { Exercise, WorkoutPlan } from '@/workout/types'
import { usePersisted } from '@/storage/db'
import { fetchExercises } from '@/catalog/catalog'
import { WEEK_ORDER, todayKey } from '@/lib/date'
import { TEMPLATES, instantiateTemplate } from '@/workout/templates'
import { PlanEditor } from '@/workout/PlanEditor'
import { PlanImport } from '@/workout/PlanImport'
import { ProfileForm } from '@/profile/ProfileForm'
import { useImportBackup } from '@/shell/useImportBackup'
import { BottomBar } from '@/components/BottomBar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const LABEL = 'label-caps tracking-[0.08em]'

type Step = 'perfil' | 'treino' | 'editor' | 'import'

function Steps({ n }: { n: 1 | 2 }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex gap-1.5" aria-hidden="true">
        {[1, 2].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full', i <= n ? 'bg-accent' : 'bg-line')} />)}
      </div>
      <div className={LABEL}>{`PASSO ${n} DE 2`}</div>
    </div>
  )
}

export function Onboarding({ setSettings }: { setSettings: (f: (s: Settings) => Settings) => void }) {
  const [step, setStep] = useState<Step>('perfil')
  const [initial, setInitial] = useState<WorkoutPlan>(DEFAULTS.workoutPlan)
  const [, setPlan] = usePersisted('workoutPlan')
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

  if (step === 'editor') return <PlanEditor initial={initial} onSave={(p) => { setPlan(p); finish() }} onCancel={() => setStep('treino')} />
  if (step === 'import') return <PlanImport onDone={finish} onBack={() => setStep('treino')} />
  if (step === 'perfil') {
    return (
      <div className="flex min-h-[calc(100dvh-var(--main-pt)-var(--main-pb))] flex-col gap-4">
        <div>
          <Steps n={1} />
          <h1 className="text-[26px] font-bold tracking-tight text-strong">Sobre você</h1>
        </div>
        <ProfileForm submitLabel="Continuar" onDone={() => setStep('treino')} />
        <div className="-mt-2 flex flex-wrap items-center justify-between">
          {/* quem instalou o app no iPhone traz aqui os dados que usava no Safari */}
          <Button type="button" variant="ghost" className="text-text-2" onClick={backup.pick}><Upload size={16} aria-hidden="true" />Restaurar backup</Button>
          {backup.input}
          <Button type="button" variant="ghost" className="text-text-2" onClick={() => setStep('treino')}>Pular</Button>
          {backup.error && <p role="alert" className="basis-full px-3.5 py-2 text-sm text-negative">{backup.error}</p>}
          {backup.confirm}
        </div>
      </div>
    )
  }
  return (
    <div className="pb-28">
      <div className="flex items-start justify-between">
        <div className="flex-1"><Steps n={2} /></div>
        <Button type="button" variant="ghost" className="-mt-2 text-text-2" onClick={finish}>Pular</Button>
      </div>
      <h1 className="mb-3 text-[26px] font-bold tracking-tight text-strong">Seu treino</h1>
      <div role="radiogroup" aria-label="Planos" className="overflow-hidden rounded-[14px] border border-border bg-panel">
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
