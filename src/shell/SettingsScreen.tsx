import { useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { Settings } from '../types'
import { exportBackup, importBackupFile } from '../storage/backup'
import { PlanEditor } from '../workout/PlanEditor'
import { PlanImport } from '../workout/PlanImport'
import { ProfileForm } from '../onboarding/Onboarding'

type View = 'menu' | 'plan' | 'import' | 'profile'

export function SettingsScreen({ onClose, setSettings }: { onClose: () => void; setSettings: (f: (s: Settings) => Settings) => void }) {
  const [view, setView] = useState<View>('menu')
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const back = () => setView('menu')

  const onFile = async (file?: File) => {
    if (!file || !confirm('Isso substitui todos os seus dados. Continuar?')) return
    try {
      await importBackupFile(file)
      location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar')
    }
  }

  if (view === 'plan') return <PlanEditor onDone={back} onCancel={back} />
  if (view === 'import') return <><button type="button" className="btn ghost" onClick={back}>Voltar</button><PlanImport onDone={back} /></>
  if (view === 'profile') return <><h1>Perfil</h1><ProfileForm submitLabel="Salvar" onDone={back} /></>

  return (
    <>
      <button type="button" className="icon-btn" aria-label="Fechar configurações" onClick={onClose}><ArrowLeft size={20} /></button>
      <h1>Configurações</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="btn ghost" onClick={() => setView('plan')}>Editar treino</button>
        <button type="button" className="btn ghost" onClick={() => setView('import')}>Importar/exportar plano (IA)</button>
        <button type="button" className="btn ghost" onClick={() => setView('profile')}>Editar perfil</button>
        <button type="button" className="btn ghost" onClick={() => exportBackup().catch((e) => setError(e instanceof Error ? e.message : 'Falha ao exportar'))}>Exportar backup</button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>Importar backup</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button type="button" className="btn ghost" onClick={() => { setSettings((s) => ({ ...s, onboardingDone: false })); onClose() }}>Refazer montagem</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
