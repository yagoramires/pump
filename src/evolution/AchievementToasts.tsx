import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { computeAchievements } from './achievements'
import { useEvolution } from './useEvolution'

/** toast de conquista nova; na primeira vez só marca as já ganhas como vistas */
export function AchievementToasts() {
  const input = useEvolution()
  const [settings, setSettings] = usePersisted('settings')
  const shown = useRef(new Set<string>())

  useEffect(() => {
    const ids = computeAchievements(input, todayKey()).filter((x) => x.earnedAt)
    const seen = settings.seenAchievements
    const fresh = seen ? ids.filter((x) => !seen.includes(x.id) && !shown.current.has(x.id)) : []
    if (seen && !fresh.length) return
    fresh.forEach((x) => { shown.current.add(x.id); toast(`Conquista: ${x.title}`) })
    setSettings((s) => ({ ...s, seenAchievements: [...new Set([...(s.seenAchievements ?? []), ...ids.map((x) => x.id)])] }))
  }, [input, settings.seenAchievements, setSettings])
  return null
}
