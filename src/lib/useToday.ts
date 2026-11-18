import { useEffect, useState } from 'react'
import { todayKey } from './date'

/** relógio da tela: o PWA volta do segundo plano sem remontar, então relê a hora ao ficar visível */
export function useToday() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setNow(new Date()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  return { now, today: todayKey(now) }
}
