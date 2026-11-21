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

/** o extra fica em `${date}~extra`: não colide com a ficha do dia e ordena depois dela */
export const trainingLog = (workoutLog: WorkoutLog, extraLog: WorkoutLog): WorkoutLog => ({
  ...workoutLog,
  ...Object.fromEntries(Object.entries(extraLog).map(([date, s]) => [`${date}~extra`, s])),
})

export const unfinishedExtra = (extraLog: WorkoutLog, today: string): WorkoutSession | undefined =>
  Object.values(extraLog)
    .filter((s) => s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
