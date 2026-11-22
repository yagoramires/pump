import { toPlanExercise } from './exercises'
import { clearRest, isUnfinishedWorkout, startSession } from './session'
import type { CustomExercise, Exercise, PlanExercise, WorkoutLog, WorkoutSession } from './types'

export const EXTRA_ID = 'extra'
export const CARDIO_ID = 'cardio'

export const startExtra = (date: string, now = new Date()): WorkoutSession => ({
  date, startedAt: now.toISOString(), workoutId: EXTRA_ID, workoutLabel: 'Extra', workoutName: 'Treino extra', exercises: [],
})

export const startCardio = (date: string, exercises: PlanExercise[]) =>
  startSession({ id: CARDIO_ID, label: 'Cardio', name: 'Somente cardio', exercises }, date)

export function addExtraExercise(s: WorkoutSession, e: Exercise | CustomExercise, sets: number): WorkoutSession {
  const { sets: _planSets, ...ex } = toPlanExercise(e)
  return { ...s, exercises: [...s.exercises, { ...ex, sets: Array(sets).fill(null) }] }
}

export const removeExercise = (s: WorkoutSession, idx: number): WorkoutSession =>
  clearRest({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) })

/** ficha e extras numa lista só: lista e não log porque o mesmo dia pode ter os dois */
export const trainingSessions = (workoutLog: WorkoutLog, extraLog: WorkoutLog): WorkoutSession[] => [...Object.values(workoutLog), ...Object.values(extraLog)]

export const unfinishedExtra = (extraLog: WorkoutLog, today: string): WorkoutSession | undefined =>
  Object.values(extraLog)
    .filter((s) => s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
