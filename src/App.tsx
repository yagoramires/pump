import { lazy, Suspense, useEffect, useState } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { BottomNav } from './shell/BottomNav'
import { InstallGate } from './shell/InstallGate'
import { FatalScreen } from './shell/ErrorBoundary'
import { SettingsScreen } from './shell/SettingsScreen'
import { isIOS, isStandalone } from './shell/platform'
import { Onboarding } from './onboarding/Onboarding'
import { TreinoTab } from './workout/TreinoTab'
import { syncPreviewCache } from './workout/previews'
import { backupDue, daysWithoutBackup, exportBackup } from './storage/backup'
import { requestPersist, usePersisted } from './storage/db'
import { todayKey } from './lib/date'
import { useAchievementToasts } from './evolution/useAchievementToasts'
import { EvolutionTab } from './evolution/EvolutionTab'
import { DEFAULT_SETTINGS } from './types'

// dieta fora do chunk principal (orçamento de bundle); continua no precache
const DietTab = lazy(() => import('./diet/DietTab').then((m) => ({ default: m.DietTab })))

const MAIN = 'mx-auto max-w-md px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))]'

// componente à parte: o hook só pode rodar no layout principal, depois dos retornos antecipados
function AchievementToasts() {
  useAchievementToasts()
  return null
}

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
        <Button type="button" onClick={() => location.reload()}>Tentar de novo</Button>
      </FatalScreen>
    )
  }
  if (!loaded) return null
  const banner = storageError && (
    <div role="alert" className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-40 mx-auto flex max-w-md items-center gap-2 rounded-[14px] border border-negative/30 bg-panel py-1 pr-1 pl-4 text-[13px] text-negative">
      <span className="flex-1">Não consegui salvar: {storageError}</span>
      <button type="button" className="flex size-11 items-center justify-center" aria-label="Fechar aviso" onClick={() => setStorageError(undefined)}><X size={18} /></button>
    </div>
  )

  if (isIOS(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone() && !settings.installDismissed) {
    return <>{banner}<InstallGate onDismiss={() => setSettings((s) => ({ ...s, installDismissed: true }))} /></>
  }
  if (!settings.onboardingDone) return <>{banner}<main className="mx-auto max-w-md px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Onboarding setSettings={setSettings} /></main></>

  const tab = settings.lastTab
  return (
    <>
      {banner}
      {backupDue(settings, todayKey()) && (
        <div className="mx-auto mt-3 max-w-md px-4"><div className="flex items-center gap-2 rounded-xl border border-accent-line bg-accent-bg py-1 pr-1 pl-3.5 text-[13px] text-text">
          <span className="flex-1">{`Faz ${daysWithoutBackup(settings, todayKey())} dias sem backup`}</span>
          <Button type="button" variant="ghost" size="sm" className="text-accent" onClick={() => exportBackup().catch((e) => toast.error(e instanceof Error ? e.message : 'Falha ao exportar'))}>Enviar backup</Button>
        </div></div>
      )}
      <main className={MAIN}>
        {showSettings ? (
          <SettingsScreen settings={settings} onClose={() => setShowSettings(false)} setSettings={setSettings} />
        ) : (
          <>
            <button type="button" className="icon-btn float-right -mt-1.5" aria-label="Configurações" onClick={() => setShowSettings(true)}><SettingsIcon size={17} /></button>
            {tab === 'treino' ? <TreinoTab /> : tab === 'evolucao' ? <EvolutionTab /> : <Suspense fallback={<p className="text-sm text-text-2">Carregando…</p>}><DietTab /></Suspense>}
          </>
        )}
      </main>
      <BottomNav tab={tab} onChange={(lastTab) => { setShowSettings(false); setSettings((s) => ({ ...s, lastTab })) }} />
      <Toaster />
      <AchievementToasts />
    </>
  )
}
