import { hasMarkedSet, markedSets } from './session'
import { isRest } from './rest'
import { repsNumber } from './reps'
import type { SessionExercise, SetDone, WorkoutLog, WorkoutSession } from './types'

const doneSets = (s: WorkoutSession) => s.exercises.flatMap(markedSets)

export const exerciseVolume = (e: SessionExercise) => markedSets(e).reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0)

export const completedSessions = (log: WorkoutLog) => Object.values(log)
  .filter((s) => !isRest(s) && s.completedAt)
  .sort((a, b) => a.date.localeCompare(b.date) || (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))

export const maxLoad = (e: SessionExercise) => Math.max(0, ...e.sets.map((x) => x?.weightKg ?? 0))

export const sessionVolume = (s: WorkoutSession) => s.exercises.reduce((a, e) => a + exerciseVolume(e), 0)

/** `now` só conta pra sessão em curso: a concluída termina no completedAt */
export const sessionStats = (s: WorkoutSession, now?: Date) => {
  const sets = s.exercises.flatMap((e) => e.sets)
  const end = s.completedAt ? Date.parse(s.completedAt) : (now ?? new Date()).getTime()
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
    if (ex && hasMarkedSet(ex)) return ex.sets
  }
  return []
}

/** carga sugerida: a da mesma série no último treino (sem série, a primeira feita), senão a do plano */
export const suggestedKg = (ex: { weightKg: number }, prev: (SetDone | null)[], set?: number): number =>
  (set === undefined ? prev.find(Boolean) : prev[set])?.weightKg ?? ex.weightKg
