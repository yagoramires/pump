import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { BottomNav } from './shell/BottomNav'
import { ComingSoon } from './shell/ComingSoon'
import { InstallGate } from './shell/InstallGate'
import { FatalScreen } from './shell/ErrorBoundary'
import { SettingsScreen } from './shell/SettingsScreen'
import { isIOS, isStandalone } from './shell/platform'
import { Onboarding } from './onboarding/Onboarding'
import { TreinoTab } from './workout/TreinoTab'
import { syncPreviewCache } from './workout/previews'
import { exportBackup, backupDue } from './storage/backup'
import { requestPersist, usePersisted } from './storage/db'
import { todayKey } from './lib/date'
import { DEFAULT_SETTINGS, type Tab } from './types'

const TITLES: Record<Tab, string> = { treino: 'Treino', evolucao: 'Evolução', dieta: 'Dieta' }

export default function App() {
  const [settings, setSettings, loaded] = usePersisted('settings', DEFAULT_SETTINGS)
  const [workoutPlan, , planLoaded] = usePersisted('workoutPlan', { workouts: [] })
  const [storageError, setStorageError] = useState<string>()
  const [readFailed, setReadFailed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    void requestPersist()
    const onError = (e: Event) => {
      const { message, read } = (e as CustomEvent<{ message: string; read?: boolean }>).detail
      if (read) setReadFailed(true)
      else setStorageError(message)
    }
    window.addEventListener('pump:storage-error', onError)
    return () => window.removeEventListener('pump:storage-error', onError)
  }, [])

  // único lugar que sincroniza as fotos: cobre editar, importar plano, restaurar backup e montagem
  useEffect(() => {
    if (planLoaded) void syncPreviewCache(workoutPlan).catch(() => {})
  }, [workoutPlan, planLoaded])

  // qualquer chave ilegível bloqueia o app: seguir com dados vazios levaria a montagem a gravar por cima
  if (readFailed) {
    return (
      <FatalScreen title="Não consegui ler seus dados" text="Eles continuam guardados neste aparelho. Feche e abra o app ou tente de novo.">
        <button type="button" className="btn" onClick={() => location.reload()}>Tentar de novo</button>
      </FatalScreen>
    )
  }
  if (!loaded) return null
  const banner = storageError && (
    <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '10px 16px', background: 'var(--danger)', color: 'var(--on-accent)' }}>
      Não consegui salvar: {storageError}
    </div>
  )

  if (isIOS(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone() && !settings.installDismissed) {
    return <>{banner}<InstallGate onDismiss={() => setSettings((s) => ({ ...s, installDismissed: true }))} /></>
  }
  if (!settings.onboardingDone) return <>{banner}<main><Onboarding setSettings={setSettings} /></main></>

  const tab = settings.lastTab
  return (
    <>
      {banner}
      {backupDue(settings, todayKey()) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--soft-bg)', border: '1px solid var(--soft-border)', color: 'var(--text)' }}>
          <span style={{ flex: 1 }}>Faz 14 dias sem backup</span>
          <button type="button" className="btn ghost" onClick={() => void exportBackup().catch(() => {})}>Exportar</button>
        </div>
      )}
      <main>
        {showSettings ? (
          <SettingsScreen onClose={() => setShowSettings(false)} setSettings={setSettings} />
        ) : (
          <>
            <button type="button" className="icon-btn" aria-label="Configurações" style={{ float: 'right' }} onClick={() => setShowSettings(true)}><SettingsIcon size={20} /></button>
            {tab === 'treino' ? <TreinoTab /> : <ComingSoon title={TITLES[tab]} />}
          </>
        )}
      </main>
      <BottomNav tab={tab} onChange={(lastTab) => { setShowSettings(false); setSettings((s) => ({ ...s, lastTab })) }} />
      <Toaster />
    </>
  )
}
