import { useEffect, useState } from 'react'
import { BottomNav } from './shell/BottomNav'
import { ComingSoon } from './shell/ComingSoon'
import { TreinoTab } from './workout/TreinoTab'
import { requestPersist, usePersisted } from './storage/db'
import { DEFAULT_SETTINGS, type Tab } from './types'

const TITLES: Record<Tab, string> = { treino: 'Treino', evolucao: 'Evolução', dieta: 'Dieta' }

export default function App() {
  const [settings, setSettings] = usePersisted('settings', DEFAULT_SETTINGS)
  const [storageError, setStorageError] = useState<string>()

  useEffect(() => {
    void requestPersist()
    const onError = (e: Event) => setStorageError((e as CustomEvent<{ message: string }>).detail.message)
    window.addEventListener('pump:storage-error', onError)
    return () => window.removeEventListener('pump:storage-error', onError)
  }, [])

  const tab = settings.lastTab
  return (
    <>
      {storageError && (
        <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '10px 16px', background: 'var(--danger)', color: 'var(--on-accent)' }}>
          Não consegui salvar: {storageError}
        </div>
      )}
      <main>
        {tab === 'treino' ? <TreinoTab /> : <ComingSoon title={TITLES[tab]} />}
      </main>
      <BottomNav tab={tab} onChange={(lastTab) => setSettings({ ...settings, lastTab })} />
    </>
  )
}
