import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import type { Exercise, Profile, Settings, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { fetchCatalog } from '../catalog/catalog'
import { todayKey } from '../lib/date'
import { TEMPLATES, instantiateTemplate } from '../workout/templates'
import { PlanEditor } from '../workout/PlanEditor'
import { PlanImport } from '../workout/PlanImport'
import { ImportBackupButton } from '../shell/ImportBackupButton'

import { parseDecimal } from '../lib/number'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const LABEL = 'text-[10px] font-semibold tracking-[0.08em] text-faint uppercase'
const EMPTY_PROFILE: Profile = { sex: 'M', heightCm: 0, weightKg: 0 }
const WEEK = [1, 2, 3, 4, 5, 6, 0] // seg..dom

export function ProfileForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const [saved, setProfile, loaded] = usePersisted('profile', EMPTY_PROFILE)
  if (!loaded) return <p className="text-sm text-text-2">Carregando…</p>
  return <ProfileFields start={saved} setProfile={setProfile} submitLabel={submitLabel} onDone={onDone} />
}

function Field({ id, label, unit, value, onChange }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={cn(LABEL, 'mb-1.5 block')}>{label}</label>
      <div className="relative">
        <Input id={id} className="pr-11" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-faint">{unit}</span>
      </div>
    </div>
  )
}

function ProfileFields({ start, setProfile, submitLabel, onDone }: { start: Profile; setProfile: (p: Profile) => void; submitLabel: string; onDone: () => void }) {
  const [sex, setSex] = useState(start.sex)
  const [h, setH] = useState(start.heightCm ? String(start.heightCm).replace('.', ',') : '')
  const [w, setW] = useState(start.weightKg ? String(start.weightKg).replace('.', ',') : '')
  const height = parseDecimal(h)
  const weight = parseDecimal(w)
  const ok = !!height && !!weight
  return (
    <div className="flex flex-1 flex-col gap-4">
      <ToggleGroup type="single" spacing={1} value={sex} onValueChange={(v) => v && setSex(v as Profile['sex'])} aria-label="Sexo" className="w-full gap-[3px] rounded-[11px] border border-border bg-panel p-[3px]">
        {(['M', 'F'] as const).map((s) => (
          <ToggleGroupItem key={s} value={s} className="h-10 flex-1 rounded-[8px] font-semibold text-text-2 data-[state=on]:bg-surface data-[state=on]:text-strong data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border-strong)]">{s === 'M' ? 'Masculino' : 'Feminino'}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Field id="altura" label="Altura" unit="cm" value={h} onChange={setH} />
      <Field id="peso" label="Peso" unit="kg" value={w} onChange={setW} />
      <p className="rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">Seus dados ficam só neste aparelho.</p>
      <Button type="button" className="mt-auto" disabled={!ok} onClick={() => { setProfile({ sex, heightCm: height!, weightKg: weight! }); onDone() }}>{submitLabel}</Button>
    </div>
  )
}

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
  const [initial, setInitial] = useState<WorkoutPlan>()
  const [error, setError] = useState<string>()
  const [picked, setPicked] = useState(TEMPLATES[0].id)
  const finish = () => setSettings((s) => ({ ...s, onboardingDone: true, firstUseAt: s.firstUseAt ?? todayKey() }))
  const template = TEMPLATES.find((t) => t.id === picked)!

  const startTemplate = async () => {
    setError(undefined)
    let catalog: Exercise[]
    try {
      catalog = await fetchCatalog()
    } catch {
      setError('Sem internet pra carregar o modelo. Monte do zero com seus exercícios ou tente de novo')
      return
    }
    setInitial(instantiateTemplate(template, catalog))
    setStep('editor')
  }

  if (step === 'editor') return <PlanEditor initial={initial} onDone={finish} onCancel={() => setStep('treino')} />
  if (step === 'import') return <PlanImport onDone={finish} onBack={() => setStep('treino')} />
  if (step === 'perfil') {
    return (
      // altura da tela menos o padding do main: Continuar e os atalhos ficam embaixo, perto do polegar
      <div className="flex min-h-[calc(100dvh-1rem-max(1rem,env(safe-area-inset-bottom)))] flex-col gap-4">
        <div>
          <Steps n={1} />
          <h1 className="text-[26px] font-bold tracking-tight text-strong">Sobre você</h1>
        </div>
        <ProfileForm submitLabel="Continuar" onDone={() => setStep('treino')} />
        {/* fora do form: aparece mesmo enquanto o perfil salvo carrega */}
        <div className="-mt-2 flex flex-wrap items-center justify-between">
          {/* quem instalou o app no iPhone traz aqui os dados que usava no Safari */}
          <ImportBackupButton label="Restaurar backup" />
          <Button type="button" variant="ghost" className="text-text-2" onClick={() => setStep('treino')}>Pular</Button>
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
                {WEEK.map((d) => <span key={d} className={cn('size-1.5 rounded-full', days.has(d) ? 'bg-accent' : 'bg-border-strong')} />)}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => { setInitial({ workouts: [] }); setStep('editor') }}><Plus size={16} aria-hidden="true" />Do zero</Button>
        <Button type="button" variant="outline" className="h-16 flex-col gap-1" onClick={() => setStep('import')}><Sparkles size={16} className="text-accent" aria-hidden="true" />Importar de IA</Button>
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-2 bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && <p role="alert" className="rounded-[10px] border border-border bg-panel px-3 py-2 text-sm text-negative">{error}</p>}
        <Button type="button" onClick={() => void startTemplate()}>{`Usar ${template.name}`}</Button>
      </div>
    </div>
  )
}
