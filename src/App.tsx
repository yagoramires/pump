import { lazy, Suspense, use, useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomNav } from '@/shell/BottomNav'
import { InstallGate } from '@/shell/InstallGate'
import { SettingsScreen } from '@/shell/SettingsScreen'
import { WhatsNew } from '@/shell/Changelog'
import { applyTheme } from '@/shell/theme'
import { isIOS, isStandalone } from '@/shell/platform'
import { Onboarding } from '@/onboarding/Onboarding'
import { TreinoTab } from '@/workout/TreinoTab'
import { PreviewSync } from '@/workout/previews'
import { backupDue, sendBackup } from '@/backup/backup'
import { boot, onStorageError, requestPersist, usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { useCheckIn } from '@/evolution/useCheckIn'
import { AchievementToasts } from '@/evolution/AchievementToasts'
import { EvolutionTab } from '@/evolution/EvolutionTab'
import { Loading } from '@/components/Loading'
import { OpenSettingsContext } from '@/components/openSettings'
import { migrateOnBoot } from '@/profile/migrate'
import { DEFAULTS, type Tab } from './schema'
import { Alert } from '@/components/ui/alert'
import { isKeyOf } from '@/lib/utils'

// dieta fora do chunk principal (orçamento de bundle); continua no precache
const DietTab = lazy(() => import('@/diet/DietTab').then((m) => ({ default: m.DietTab })))
const TAB_SCREENS = {
  treino: <TreinoTab />,
  evolucao: <EvolutionTab />,
  dieta: <Suspense fallback={<Loading />}><DietTab /></Suspense>,
} satisfies Record<Tab, ReactNode>

const MAIN = 'mx-auto max-w-md px-4 pt-(--main-pt) pb-[calc(var(--nav-h)+28px+env(safe-area-inset-bottom))]'

export default function App() {
  return <Suspense fallback={<main className={MAIN}><Loading /></main>}><Shell /></Suspense>
}

function Shell() {
  use(boot(migrateOnBoot))
  const [settings, setSettings] = usePersisted('settings')
  useEffect(() => applyTheme(settings.theme), [settings.theme])
  const [storageError, setStorageError] = useState<string>()
  const [showSettings, setShowSettings] = useState(false)
  const { due } = useCheckIn()

  useEffect(() => {
    void requestPersist()
    return onStorageError(setStorageError)
  }, [])

  const banner = storageError && (
    <Alert variant="destructive" className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-(--z-header) mx-auto flex max-w-md items-center gap-2 py-1 pr-1">
      <span className="flex-1">Não consegui salvar: {storageError}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Fechar aviso" onClick={() => setStorageError(undefined)}><X size={18} /></Button>
    </Alert>
  )

  if (isIOS() && !isStandalone() && !settings.installDismissed) {
    return <>{banner}<PreviewSync /><InstallGate onDismiss={() => setSettings((s) => ({ ...s, installDismissed: true }))} /></>
  }
  if (!settings.onboardingDone) return <>{banner}<PreviewSync /><main className="mx-auto max-w-md px-4 pt-(--main-pt) pb-(--main-pb)"><Onboarding /></main></>

  const tab: Tab = isKeyOf(TAB_SCREENS, settings.lastTab) ? settings.lastTab : DEFAULTS.settings.lastTab
  const backupDays = backupDue(settings, todayKey())
  return (
    <>
      {banner}
      <PreviewSync />
      {backupDays !== undefined && (
        <div className="mx-auto mt-3 max-w-md px-4"><Alert variant="info" role="status" className="flex items-center gap-2 py-1 pr-1">
          <span className="flex-1">{`Faz ${backupDays} dias sem backup`}</span>
          <Button type="button" variant="link" size="sm" className="text-accent" onClick={sendBackup}>Enviar backup</Button>
        </Alert></div>
      )}
      <main className={MAIN}>
        {showSettings ? (
          <SettingsScreen onClose={() => setShowSettings(false)} />
        ) : (
          <OpenSettingsContext value={() => setShowSettings(true)}>
            {TAB_SCREENS[tab]}
          </OpenSettingsContext>
        )}
      </main>
      <BottomNav tab={tab} alerts={due ? { evolucao: 'atualização pendente' } : undefined} onChange={(lastTab) => { setShowSettings(false); setSettings((s) => ({ ...s, lastTab })) }} />
      <AchievementToasts />
      <WhatsNew seen={settings.seenChangelog} onClose={(seenChangelog) => setSettings((s) => ({ ...s, seenChangelog }))} />
    </>
  )
}
