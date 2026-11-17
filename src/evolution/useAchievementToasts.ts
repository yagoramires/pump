import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePersisted } from '../storage/db'
import { DEFAULT_SETTINGS, NO_PROFILE } from '../types'
import { todayKey } from '../lib/date'
import { computeAchievements } from './achievements'

const NO_LOG = {}
const NO_PLAN = { workouts: [] }
const NONE: never[] = []

/** toast de conquista nova; na primeira vez só marca as já ganhas como vistas */
export function useAchievementToasts(): void {
  const [workoutLog, , a] = usePersisted('workoutLog', NO_LOG)
  const [workoutPlan, , b] = usePersisted('workoutPlan', NO_PLAN)
  const [measurements, , c] = usePersisted('measurements', NONE)
  const [photoSets, , d] = usePersisted('photoSets', NONE)
  const [profile, , e] = usePersisted('profile', NO_PROFILE)
  const [settings, setSettings, f] = usePersisted('settings', DEFAULT_SETTINGS)
  const shown = useRef(new Set<string>())
  const ready = a && b && c && d && e && f

  useEffect(() => {
    if (!ready) return
    const ids = computeAchievements({ workoutLog, workoutPlan, measurements, photoSets, profile }, todayKey()).filter((x) => x.earnedAt)
    const seen = settings.seenAchievements
    const fresh = seen ? ids.filter((x) => !seen.includes(x.id) && !shown.current.has(x.id)) : []
    if (seen && !fresh.length) return
    fresh.forEach((x) => { shown.current.add(x.id); toast(`Conquista: ${x.title}`) })
    setSettings((s) => ({ ...s, seenAchievements: [...new Set([...(s.seenAchievements ?? []), ...ids.map((x) => x.id)])] }))
  }, [ready, workoutLog, workoutPlan, measurements, photoSets, profile, settings.seenAchievements, setSettings])
}
