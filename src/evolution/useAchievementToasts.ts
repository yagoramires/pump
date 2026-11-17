import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePersisted } from '../storage/db'
import { DEFAULTS } from '../schema'
import { todayKey } from '../lib/date'
import { computeAchievements } from './achievements'

/** toast de conquista nova; na primeira vez só marca as já ganhas como vistas */
export function useAchievementToasts(): void {
  const [workoutLog, , a] = usePersisted('workoutLog', DEFAULTS.workoutLog)
  const [workoutPlan, , b] = usePersisted('workoutPlan', DEFAULTS.workoutPlan)
  const [measurements, , c] = usePersisted('measurements', DEFAULTS.measurements)
  const [photoSets, , d] = usePersisted('photoSets', DEFAULTS.photoSets)
  const [profile, , e] = usePersisted('profile', DEFAULTS.profile)
  const [settings, setSettings, f] = usePersisted('settings', DEFAULTS.settings)
  const [dietLog, , g] = usePersisted('dietLog', DEFAULTS.dietLog)
  const [waterLog, , h] = usePersisted('waterLog', DEFAULTS.waterLog)
  const [dietPlan, , i] = usePersisted('dietPlan', DEFAULTS.dietPlan)
  const shown = useRef(new Set<string>())
  const ready = a && b && c && d && e && f && g && h && i

  useEffect(() => {
    if (!ready) return
    const ids = computeAchievements({ workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan }, todayKey()).filter((x) => x.earnedAt)
    const seen = settings.seenAchievements
    const fresh = seen ? ids.filter((x) => !seen.includes(x.id) && !shown.current.has(x.id)) : []
    if (seen && !fresh.length) return
    fresh.forEach((x) => { shown.current.add(x.id); toast(`Conquista: ${x.title}`) })
    setSettings((s) => ({ ...s, seenAchievements: [...new Set([...(s.seenAchievements ?? []), ...ids.map((x) => x.id)])] }))
  }, [ready, workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan, settings.seenAchievements, setSettings])
}
