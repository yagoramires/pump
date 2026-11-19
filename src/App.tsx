import { lazy, Suspense, use, useEffect, useState } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { useCheckIn } from '@/evolution/useCheckIn'
import { AchievementToasts } from '@/evolution/AchievementToasts'
import { EvolutionTab } from '@/evolution/EvolutionTab'
import { Loading } from '@/components/Loading'
import { migrationFor } from '@/profile/migrate'
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
  use(migrationFor(readKey('profile')))
  const [settings, setSettings] = usePersisted('settings')
  const [storageError, setStorageError] = useState<string>()
  const [showSettings, setShowSettings] = useState(false)
  const { due } = useCheckIn()
  const backup = useBackupExport(toast.error)

  useEffect(() => {
    void requestPersist()
    return onStorageError(setStorageError)
  }, [])

  const banner = storageError && (
    <Card role="alert" className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-(--z-header) mx-auto max-w-md flex-row items-center gap-2 border-negative/30 py-1 pr-1 pl-4 text-[13px] text-negative">
      <span className="flex-1">Não consegui salvar: {storageError}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Fechar aviso" onClick={() => setStorageError(undefined)}><X size={18} /></Button>
    </Card>
  )

  if (isIOS() && !isStandalone() && !settings.installDismissed) {
    return <>{banner}<PreviewSync /><InstallGate onDismiss={() => setSettings((s) => ({ ...s, installDismissed: true }))} /></>
  }
  if (!settings.onboardingDone) return <>{banner}<PreviewSync /><main className="mx-auto max-w-md px-4 pt-(--main-pt) pb-(--main-pb)"><Onboarding /></main></>

  const tab = settings.lastTab
  return (
    <>
      {banner}
      <PreviewSync />
      {backupDue(settings, todayKey()) && (
        <div className="mx-auto mt-3 max-w-md px-4"><Card className="flex-row items-center gap-2 rounded-xl border-accent-line bg-accent-bg py-1 pr-1 pl-3.5 text-[13px] text-text">
          <span className="flex-1">{`Faz ${daysWithoutBackup(settings, todayKey())} dias sem backup`}</span>
          <Button type="button" variant="ghost" size="sm" className="text-accent" onClick={backup.send}>Enviar backup</Button>
        </Card></div>
      )}
      <main className={MAIN}>
        {showSettings ? (
          <SettingsScreen onClose={() => setShowSettings(false)} />
        ) : (
          <>
            <Button type="button" variant="outline" size="icon" className="float-right mt-(--gear-offset)" aria-label="Configurações" onClick={() => setShowSettings(true)}><SettingsIcon size={17} /></Button>
            {tab === 'treino' ? <TreinoTab /> : tab === 'evolucao' ? <EvolutionTab /> : <Suspense fallback={<Loading />}><DietTab /></Suspense>}
          </>
        )}
      </main>
      <BottomNav tab={tab} alerts={due ? { evolucao: 'atualização pendente' } : undefined} onChange={(lastTab) => { setShowSettings(false); setSettings((s) => ({ ...s, lastTab })) }} />
      <Toaster />
      <AchievementToasts />
    </>
  )
}
