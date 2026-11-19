import { parseDayKey } from '@/lib/date'
import { isCardio } from './reps'
import { isRest } from './rest'
import type { SessionExercise, SetDone, Workout, WorkoutPlan, WorkoutSession } from './types'

const MIDNIGHT_HOLD_MS = 6 * 60 * 60 * 1000

export const markedSets = (e: SessionExercise) => e.sets.filter((set) => set !== null)
export const hasMarkedSets = (s: WorkoutSession) => s.exercises.some(hasMarkedSet)
export const hasMarkedSet = (e: SessionExercise) => e.sets.some(Boolean)
export const isExerciseComplete = (e: SessionExercise) => !e.sets.includes(null)
export const firstIncompleteExercise = (s: WorkoutSession) => s.exercises.findIndex((e) => !isCardio(e) && !isExerciseComplete(e))
export const isUnfinishedWorkout = (s: WorkoutSession) => !isRest(s) && !s.completedAt && hasMarkedSets(s)

export const holdsTrainingDay = (s: WorkoutSession | undefined, now: Date) =>
  !!s && isUnfinishedWorkout(s) && now.getTime() - Date.parse(s.startedAt ?? '') < MIDNIGHT_HOLD_MS

export type ActiveRest = { paused: true; leftMs: number } | { paused: false; endAt: number }

export const restRemainingSeconds = (rest: ActiveRest, now: number) =>
  Math.max(0, Math.ceil((rest.paused ? rest.leftMs : rest.endAt - now) / 1000))

export function activeRest(s: WorkoutSession | undefined): ActiveRest | undefined {
  if (s?.restPausedLeftMs !== undefined) return { paused: true, leftMs: s.restPausedLeftMs }
  if (s?.restEndsAt !== undefined) return { paused: false, endAt: s.restEndsAt }
}

export function restExerciseIndex(s: WorkoutSession) {
  // Sessões antigas não gravavam o exercício associado ao descanso.
  return s.restExIdx ?? Math.max(0, firstIncompleteExercise(s))
}

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

export const clearRest = (s: WorkoutSession): WorkoutSession => ({ ...s, restEndsAt: undefined, restPausedLeftMs: undefined, restExIdx: undefined })
export const startRest = (s: WorkoutSession, exIdx: number, ms: number, now: number): WorkoutSession => ({ ...s, restEndsAt: now + ms, restPausedLeftMs: undefined, restExIdx: exIdx })
export function toggleRestPause(s: WorkoutSession, now: number) {
  const rest = activeRest(s)
  if (!rest) return s
  return rest.paused
    ? { ...s, restEndsAt: now + rest.leftMs, restPausedLeftMs: undefined }
    : { ...s, restEndsAt: undefined, restPausedLeftMs: Math.max(0, rest.endAt - now) }
}

export function extendRest(s: WorkoutSession, extraMs: number) {
  const rest = activeRest(s)
  if (!rest) return s
  return rest.paused
    ? { ...s, restPausedLeftMs: rest.leftMs + extraMs }
    : { ...s, restEndsAt: rest.endAt + extraMs }
}

export function toggleSetWithRest(s: WorkoutSession, exIdx: number, setIdx: number, value: SetDone, now: number) {
  const exercise = s.exercises[exIdx]
  if (exercise.sets[setIdx]) return setDone(s, exIdx, setIdx, null)
  const next = setDone(s, exIdx, setIdx, value)
  return isCardio(exercise) ? next : startRest(next, exIdx, exercise.restSec * 1000, now)
}

export function changeRestDuration(s: WorkoutSession, exIdx: number, restSec: number, now: number) {
  return {
    ...startRest(s, exIdx, restSec * 1000, now),
    exercises: s.exercises.map((e, i) => i === exIdx ? { ...e, restSec } : e),
  }
}

/** leva o descanso novo pro plano. O plano pode ter sido editado no meio do treino: acha o exercício pela
 * ocorrência entre os de mesmo id (o 2º supino da sessão é o 2º do treino), não pela posição */
export function changePlanRest(plan: WorkoutPlan, s: WorkoutSession, exIdx: number, restSec: number): WorkoutPlan {
  const id = s.exercises[exIdx]?.exerciseId
  const nth = s.exercises.slice(0, exIdx).filter((e) => e.exerciseId === id).length
  return {
    ...plan,
    workouts: plan.workouts.map((w) => {
      if (w.id !== s.workoutId) return w
      let seen = 0
      return { ...w, exercises: w.exercises.map((e) => (e.exerciseId === id && seen++ === nth ? { ...e, restSec } : e)) }
    }),
  }
}

export const completeSession = (s: WorkoutSession, now: Date): WorkoutSession => ({ ...clearRest(s), completedAt: now.toISOString() })

export const reopenSession = (s: WorkoutSession): WorkoutSession => ({ ...s, completedAt: undefined })

export function completeUnfinishedSession(s: WorkoutSession) {
  const end = parseDayKey(s.date)
  end.setHours(23, 59)
  // A hora usada para ordenar a sessão antiga não serve para calcular sua duração.
  const { startedAt: _startedAt, ...session } = s
  return completeSession(session, end)
}
