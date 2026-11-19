import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { computeAchievements } from './achievements'
import { useEvolution } from './useEvolution'

export function AchievementToasts() {
  const input = useEvolution()
  const [settings, setSettings] = usePersisted('settings')
  const { today } = useToday()
  const shown = useRef(new Set<string>())

  useEffect(() => {
    const ids = computeAchievements(input, today).filter((x) => x.earnedAt)
    const seen = settings.seenAchievements
    // sem lista ainda (1ª vez): marca tudo como visto, sem toast pelas conquistas que já existiam
    const fresh = seen ? ids.filter((x) => !seen.includes(x.id) && !shown.current.has(x.id)) : []
    if (seen && !fresh.length) return
    fresh.forEach((x) => { shown.current.add(x.id); toast(`Conquista: ${x.title}`) })
    setSettings((s) => ({ ...s, seenAchievements: [...new Set([...(s.seenAchievements ?? []), ...ids.map((x) => x.id)])] }))
  }, [input, today, settings.seenAchievements, setSettings])
  return null
}
