import type { SessionExercise, SetDone, WorkoutLog, WorkoutSession } from './types'

export const repsNumber = (reps: string): number => Number(/\d+/.exec(reps)?.[0] ?? 0)

const doneSets = (s: WorkoutSession) => s.exercises.flatMap((e) => e.sets).filter((d): d is SetDone => d !== null)

/** sessões concluídas, por data */
export const completedSessions = (log: WorkoutLog) => Object.values(log).filter((s) => s.completedAt).sort((a, b) => a.date.localeCompare(b.date))

export const maxLoad = (e: SessionExercise) => Math.max(0, ...e.sets.map((x) => x?.weightKg ?? 0))

export const sessionVolume = (s: WorkoutSession) => doneSets(s).reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0)

export const sessionStats = (s: WorkoutSession, now: Date) => {
  const sets = s.exercises.flatMap((e) => e.sets)
  const end = s.completedAt ? Date.parse(s.completedAt) : now.getTime()
  const ms = s.startedAt ? end - Date.parse(s.startedAt) : NaN
  return {
    done: doneSets(s).length,
    total: sets.length,
    volumeKg: sessionVolume(s),
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
