import { toPlanExercise } from './exercises'
import { clearRest, isUnfinishedWorkout } from './session'
import type { CustomExercise, Exercise, WorkoutLog, WorkoutSession } from './types'

export const EXTRA_ID = 'extra'

export const startExtra = (date: string, now = new Date()): WorkoutSession => ({
  date, startedAt: now.toISOString(), workoutId: EXTRA_ID, workoutLabel: 'Extra', workoutName: 'Treino extra', exercises: [],
})

export function addExtraExercise(s: WorkoutSession, e: Exercise | CustomExercise, sets: number): WorkoutSession {
  const { sets: _planSets, ...ex } = toPlanExercise(e)
  return { ...s, exercises: [...s.exercises, { ...ex, sets: Array(sets).fill(null) }] }
}

export const removeExercise = (s: WorkoutSession, idx: number): WorkoutSession =>
  clearRest({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) })

// shortcut: o extra entra como `${date}~extra` e as chaves do log mesclado deixam de ser datas; quem lê usa só `session.date`.
// Se algo precisar indexar esse log por data, trocar o log mesclado por WorkoutSession[].
export const trainingLog = (workoutLog: WorkoutLog, extraLog: WorkoutLog): WorkoutLog => ({
  ...workoutLog,
  ...Object.fromEntries(Object.entries(extraLog).map(([date, s]) => [`${date}~extra`, s])),
})

export const unfinishedExtra = (extraLog: WorkoutLog, today: string): WorkoutSession | undefined =>
  Object.values(extraLog)
    .filter((s) => s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
