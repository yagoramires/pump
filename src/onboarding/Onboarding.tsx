import { useState } from 'react'
import type { Exercise, Profile, Settings, WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { fetchCatalog } from '../catalog/catalog'
import { todayKey } from '../lib/date'
import { TEMPLATES, instantiateTemplate } from '../workout/templates'
import { PlanEditor } from '../workout/PlanEditor'
import { PlanImport } from '../workout/PlanImport'
import { ImportBackupButton } from '../shell/ImportBackupButton'

const EMPTY_PROFILE: Profile = { sex: 'M', heightCm: 0, weightKg: 0 }

export function ProfileForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const [saved, setProfile, loaded] = usePersisted('profile', EMPTY_PROFILE)
  if (!loaded) return <p className="muted-note">Carregando…</p>
  return <ProfileFields start={saved} setProfile={setProfile} submitLabel={submitLabel} onDone={onDone} />
}

function ProfileFields({ start, setProfile, submitLabel, onDone }: { start: Profile; setProfile: (p: Profile) => void; submitLabel: string; onDone: () => void }) {
  const [sex, setSex] = useState(start.sex)
  const [h, setH] = useState(start.heightCm ? String(start.heightCm) : '')
  const [w, setW] = useState(start.weightKg ? String(start.weightKg) : '')
  const ok = Number(h) > 0 && Number(w) > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="group" aria-label="Sexo" style={{ display: 'flex', gap: 8 }}>
        {(['M', 'F'] as const).map((s) => (
          <button key={s} type="button" className={sex === s ? 'btn' : 'btn ghost'} aria-pressed={sex === s} onClick={() => setSex(s)}>{s === 'M' ? 'Masculino' : 'Feminino'}</button>
        ))}
      </div>
      <label>Altura (cm)<input className="field" type="number" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} /></label>
      <label>Peso (kg)<input className="field" type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></label>
      <button type="button" className="btn" disabled={!ok} onClick={() => { setProfile({ sex, heightCm: Number(h), weightKg: Number(w) }); onDone() }}>{submitLabel}</button>
    </div>
  )
}

type Step = 'perfil' | 'treino' | 'editor' | 'import'

export function Onboarding({ setSettings }: { setSettings: (f: (s: Settings) => Settings) => void }) {
  const [step, setStep] = useState<Step>('perfil')
  const [initial, setInitial] = useState<WorkoutPlan>()
  const [error, setError] = useState<string>()
  const finish = () => setSettings((s) => ({ ...s, onboardingDone: true, firstUseAt: s.firstUseAt ?? todayKey() }))

  const pickTemplate = async (id: string) => {
    setError(undefined)
    let catalog: Exercise[]
    try {
      catalog = await fetchCatalog()
    } catch {
      setError('Sem internet pra carregar o modelo. Monte do zero com seus exercícios ou tente de novo')
      return
    }
    setInitial(instantiateTemplate(TEMPLATES.find((t) => t.id === id)!, catalog))
    setStep('editor')
  }

  if (step === 'editor') return <PlanEditor initial={initial} onDone={finish} onCancel={() => setStep('treino')} />
  if (step === 'import') return <><button type="button" className="btn ghost" onClick={() => setStep('treino')}>Voltar</button><PlanImport onDone={finish} /></>
  if (step === 'perfil') {
    return (
      <>
        <h1>Perfil</h1>
        <ProfileForm submitLabel="Continuar" onDone={() => setStep('treino')} />
        {/* fora do form: aparece mesmo enquanto o perfil salvo carrega */}
        <div className="stack" style={{ marginTop: 10 }}>
          <button type="button" className="btn ghost" onClick={() => setStep('treino')}>Pular</button>
          {/* quem instalou o app no iPhone traz aqui os dados que usava no Safari */}
          <ImportBackupButton label="Restaurar backup" />
        </div>
      </>
    )
  }
  return (
    <>
      <h1>Treino</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="card" style={{ textAlign: 'left', color: 'var(--text)', cursor: 'pointer' }} onClick={() => void pickTemplate(t.id)}>
            <strong>{t.name}</strong><br />{t.description}
          </button>
        ))}
        <button type="button" className="btn ghost" onClick={() => { setInitial({ workouts: [] }); setStep('editor') }}>Montar do zero</button>
        <button type="button" className="btn ghost" onClick={() => setStep('import')}>Importar de uma IA</button>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="btn ghost" onClick={() => setStep('perfil')}>Voltar</button>
        <button type="button" className="btn ghost" onClick={finish}>Pular</button>
      </div>
    </>
  )
}
