import { lazy, Suspense, use, useEffect, useState } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { BottomNav } from '@/shell/BottomNav'
import { InstallGate } from '@/shell/InstallGate'
import { SettingsScreen } from '@/shell/SettingsScreen'
import { isIOS, isStandalone } from '@/shell/platform'
import { Onboarding } from '@/onboarding/Onboarding'
import { TreinoTab } from '@/workout/TreinoTab'
import { PreviewSync } from '@/workout/previews'
import { backupDue, daysWithoutBackup } from '@/storage/backup'
import { useBackupExport } from '@/shell/useBackupExport'
import { onStorageError, readKey, requestPersist, usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { AchievementToasts } from '@/evolution/AchievementToasts'
import { EvolutionTab } from '@/evolution/EvolutionTab'
import { Loading } from '@/components/Loading'
import { USER_KEYS } from './schema'

// dieta fora do chunk principal (orçamento de bundle); continua no precache
const DietTab = lazy(() => import('@/diet/DietTab').then((m) => ({ default: m.DietTab })))

const MAIN = 'mx-auto max-w-md px-4 pt-(--main-pt) pb-[calc(var(--nav-h)+28px+env(safe-area-inset-bottom))]'

export default function App() {
  return <Suspense fallback={<main className={MAIN}><Loading /></main>}><Shell /></Suspense>
}

function Shell() {
  const reads = USER_KEYS.map((k) => readKey(k))
  for (const r of reads) use(r)
  const [settings, setSettings] = usePersisted('settings')
  const [storageError, setStorageError] = useState<string>()
  const [showSettings, setShowSettings] = useState(false)
  const backup = useBackupExport(toast.error)

  useEffect(() => {
    void requestPersist()
    return onStorageError(setStorageError)
  }, [])

  const banner = storageError && (
    <div role="alert" className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-(--z-header) mx-auto flex max-w-md items-center gap-2 rounded-[14px] border border-negative/30 bg-panel py-1 pr-1 pl-4 text-[13px] text-negative">
      <span className="flex-1">Não consegui salvar: {storageError}</span>
      <button type="button" className="flex size-11 items-center justify-center" aria-label="Fechar aviso" onClick={() => setStorageError(undefined)}><X size={18} /></button>
    </div>
  )

  if (isIOS() && !isStandalone() && !settings.installDismissed) {
    return <>{banner}<InstallGate onDismiss={() => setSettings((s) => ({ ...s, installDismissed: true }))} /></>
  }
  if (!settings.onboardingDone) return <>{banner}<main className="mx-auto max-w-md px-4 pt-(--main-pt) pb-(--main-pb)"><Onboarding setSettings={setSettings} /></main></>

  const tab = settings.lastTab
  return (
    <>
      {banner}
      {backupDue(settings, todayKey()) && (
        <div className="mx-auto mt-3 max-w-md px-4"><div className="flex items-center gap-2 rounded-xl border border-accent-line bg-accent-bg py-1 pr-1 pl-3.5 text-[13px] text-text">
          <span className="flex-1">{`Faz ${daysWithoutBackup(settings, todayKey())} dias sem backup`}</span>
          <Button type="button" variant="ghost" size="sm" className="text-accent" onClick={backup.send}>Enviar backup</Button>
        </div></div>
      )}
      <main className={MAIN}>
        {showSettings ? (
          <SettingsScreen settings={settings} onClose={() => setShowSettings(false)} setSettings={setSettings} />
        ) : (
          <>
            <button type="button" className="icon-btn float-right mt-(--gear-offset)" aria-label="Configurações" onClick={() => setShowSettings(true)}><SettingsIcon size={17} /></button>
            {tab === 'treino' ? <TreinoTab /> : tab === 'evolucao' ? <EvolutionTab /> : <Suspense fallback={<Loading />}><DietTab /></Suspense>}
          </>
        )}
      </main>
      <BottomNav tab={tab} onChange={(lastTab) => { setShowSettings(false); setSettings((s) => ({ ...s, lastTab })) }} />
      <Toaster />
      <AchievementToasts />
      <PreviewSync />
    </>
  )
}
