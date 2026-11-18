import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePersisted } from '../storage/db'
import { todayKey } from '../lib/date'
import { computeAchievements } from './achievements'

/** toast de conquista nova; na primeira vez só marca as já ganhas como vistas */
export function useAchievementToasts(): void {
  const [workoutLog] = usePersisted('workoutLog')
  const [workoutPlan] = usePersisted('workoutPlan')
  const [measurements] = usePersisted('measurements')
  const [photoSets] = usePersisted('photoSets')
  const [profile] = usePersisted('profile')
  const [settings, setSettings] = usePersisted('settings')
  const [dietLog] = usePersisted('dietLog')
  const [waterLog] = usePersisted('waterLog')
  const [dietPlan] = usePersisted('dietPlan')
  const shown = useRef(new Set<string>())

  useEffect(() => {
    const ids = computeAchievements({ workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan }, todayKey()).filter((x) => x.earnedAt)
    const seen = settings.seenAchievements
    const fresh = seen ? ids.filter((x) => !seen.includes(x.id) && !shown.current.has(x.id)) : []
    if (seen && !fresh.length) return
    fresh.forEach((x) => { shown.current.add(x.id); toast(`Conquista: ${x.title}`) })
    setSettings((s) => ({ ...s, seenAchievements: [...new Set([...(s.seenAchievements ?? []), ...ids.map((x) => x.id)])] }))
  }, [workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan, settings.seenAchievements, setSettings])
}
