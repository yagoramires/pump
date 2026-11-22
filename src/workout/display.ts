import { formatDayLabel, p2 } from '@/lib/date'
import { formatKg } from '@/lib/number'
import type { PlanExercise, SessionExercise } from './types'
import { isCardio, setCount } from './reps'

export const workoutDayLabel = (date: string, label: string) => `${formatDayLabel(date)} · TREINO ${label}`

export function exerciseSummary(e: PlanExercise | SessionExercise) {
  return `${setCount(e)} × ${e.reps} · ${formatKg(e.weightKg)} kg`
}

export const restSecondsLabel = (sec: number) => `${sec} s`

export const planExerciseLine = (e: PlanExercise) => (isCardio(e) ? e.reps : `${exerciseSummary(e)} · ${restSecondsLabel(e.restSec)}`)

export function restClock(sec: number, padMinutes = false) {
  const minutes = Math.floor(sec / 60)
  return `${padMinutes ? p2(minutes) : minutes}:${p2(sec % 60)}`
}

