import type { SetDone, Workout, WorkoutSession } from './types'

export const startSession = (w: Workout, date: string, now = new Date()): WorkoutSession => ({
  date,
  startedAt: now.toISOString(),
  workoutId: w.id,
  workoutLabel: w.label,
  workoutName: w.name,
  exercises: structuredClone(w.exercises).map((e) => ({ ...e, sets: Array<SetDone | null>(e.sets).fill(null) })),
})

export const setDone = (s: WorkoutSession, exIdx: number, setIdx: number, v: SetDone | null): WorkoutSession => ({
  ...s,
  exercises: s.exercises.map((e, i) => (i === exIdx ? { ...e, sets: e.sets.map((d, j) => (j === setIdx ? v : d)) } : e)),
})

/** descanso: um só lugar mexe nos três campos juntos */
export const clearRest = (s: WorkoutSession): WorkoutSession => ({ ...s, restEndsAt: undefined, restPausedLeftMs: undefined, restExIdx: undefined })
export const startRest = (s: WorkoutSession, exIdx: number, ms: number, now: number): WorkoutSession => ({ ...s, restEndsAt: now + ms, restPausedLeftMs: undefined, restExIdx: exIdx })
export const pauseRest = (s: WorkoutSession, now: number): WorkoutSession => ({ ...s, restEndsAt: undefined, restPausedLeftMs: Math.max(0, (s.restEndsAt ?? now) - now) })
export const resumeRest = (s: WorkoutSession, now: number): WorkoutSession => ({ ...s, restEndsAt: now + (s.restPausedLeftMs ?? 0), restPausedLeftMs: undefined })

export const completeSession = (s: WorkoutSession, now: Date): WorkoutSession => ({ ...clearRest(s), completedAt: now.toISOString() })
