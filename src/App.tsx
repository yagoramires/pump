import { useState } from 'react'
import { BottomNav } from './shell/BottomNav'
import { ComingSoon } from './shell/ComingSoon'
import type { Tab } from './types'

const TITLES: Record<Tab, string> = { treino: 'Treino', evolucao: 'Evolução', dieta: 'Dieta' }

export default function App() {
  const [tab, setTab] = useState<Tab>('treino')
  return (
    <>
      <main>
        <ComingSoon title={TITLES[tab]} />
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </>
  )
}
