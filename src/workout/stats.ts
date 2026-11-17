import type { SetDone, WorkoutLog, WorkoutSession } from '../types'

export const repsNumber = (reps: string): number => Number(/\d+/.exec(reps)?.[0] ?? 0)

export const sessionStats = (s: WorkoutSession, now: Date) => {
  const sets = s.exercises.flatMap((e) => e.sets)
  const doneSets = sets.filter((d): d is SetDone => d !== null)
  const end = s.completedAt ? new Date(s.completedAt) : now
  return {
    done: doneSets.length,
    total: sets.length,
    volumeKg: doneSets.reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0),
    minutes: s.startedAt ? Math.floor((end.getTime() - new Date(s.startedAt).getTime()) / 60000) : null,
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

export const firstIncomplete = (s: WorkoutSession): number => s.exercises.findIndex((e) => e.sets.includes(null))
