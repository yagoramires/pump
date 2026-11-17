import { isCardio } from './cardio'
import type { SetDone, WorkoutLog, WorkoutSession } from '../types'

export const repsNumber = (reps: string): number => Number(/\d+/.exec(reps)?.[0] ?? 0)

export const sessionStats = (s: WorkoutSession, now: Date) => {
  const sets = s.exercises.flatMap((e) => e.sets)
  const doneSets = sets.filter((d): d is SetDone => d !== null)
  const end = s.completedAt ? Date.parse(s.completedAt) : now.getTime()
  const ms = s.startedAt ? end - Date.parse(s.startedAt) : NaN
  return {
    done: doneSets.length,
    total: sets.length,
    volumeKg: doneSets.reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0),
    minutes: Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 60000)) : null,
  }
}

export const previousSets = (log: WorkoutLog, today: string, exerciseId: string): (SetDone | null)[] => {
  const dates = Object.keys(log).filter((d) => d < today).sort().reverse()
  for (const d of dates) {
    const ex = log[d].exercises.find((e) => e.exerciseId === exerciseId)
    if (ex) return ex.sets
  }
  return []
}

// cardio fica num bloco à parte, sem acordeão: abre o primeiro exercício de força incompleto
export const firstIncomplete = (s: WorkoutSession): number => s.exercises.findIndex((e) => !isCardio(e) && e.sets.includes(null))
