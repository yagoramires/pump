import type { SetDone, Workout, WorkoutSession } from '../types'

export const startSession = (w: Workout, date: string): WorkoutSession => ({
  date,
  workoutId: w.id,
  workoutLabel: w.label,
  workoutName: w.name,
  exercises: structuredClone(w.exercises).map((e) => ({ ...e, sets: Array<SetDone | null>(e.sets).fill(null) })),
})

export const setDone = (s: WorkoutSession, exIdx: number, setIdx: number, v: SetDone | null): WorkoutSession => ({
  ...s,
  exercises: s.exercises.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.map((d, j) => (j === setIdx ? v : d)) } : e)),
})

export const setRestEnd = (s: WorkoutSession, endAt: number | undefined): WorkoutSession => ({ ...s, restEndsAt: endAt })

export const completeSession = (s: WorkoutSession, now: Date): WorkoutSession => ({
  ...s,
  completedAt: now.toISOString(),
  restEndsAt: undefined,
})
