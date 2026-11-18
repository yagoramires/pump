import { useEffect, useState } from 'react'
import { todayKey } from './date'

const clocks = new Set<(d: Date) => void>()

/** o PWA volta do segundo plano sem remontar, então o relógio relê a hora ao ficar visível */
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
