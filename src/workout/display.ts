import { formatDayLabel, p2 } from '@/lib/date'
import { formatKg } from '@/lib/number'
import type { PlanExercise, SessionExercise } from './types'

export const workoutDayLabel = (date: string, label: string) => `${formatDayLabel(date)} · TREINO ${label}`

export function exerciseSummary(e: PlanExercise | SessionExercise) {
  const sets = typeof e.sets === 'number' ? e.sets : e.sets.length
  return `${sets} × ${e.reps} · ${formatKg(e.weightKg)} kg`
}

export const restSecondsLabel = (sec: number) => `${sec} s`

export function restClock(sec: number, padMinutes = false) {
  const minutes = Math.floor(sec / 60)
  return `${padMinutes ? p2(minutes) : minutes}:${p2(sec % 60)}`
}
