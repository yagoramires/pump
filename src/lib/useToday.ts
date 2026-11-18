import { useEffect, useState } from 'react'
import { todayKey } from './date'

// os relógios montados agora (aba e refeição aberta): um toque acerta todos
const clocks = new Set<(d: Date) => void>()

/** relógio da tela: o PWA volta do segundo plano sem remontar, então relê a hora ao ficar visível.
 * `tick()` relê a hora no toque (uma ação depois da meia-noite vai pro dia novo) e devolve o dia */
export function useToday() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    clocks.add(setNow)
    const onVisible = () => { if (document.visibilityState === 'visible') setNow(new Date()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clocks.delete(setNow)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  const tick = () => {
    const at = new Date()
    for (const set of clocks) set(at)
    return todayKey(at)
  }
  return { now, today: todayKey(now), tick }
}
