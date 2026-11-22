import { isCardio, isTimed, repsNumber } from './reps'
import { markedSets, nthOccurrence } from './session'
import { previousSets } from './stats'
import type { SessionExercise, SetDone, WorkoutSession } from './types'

export type Trend = 'up' | 'same' | 'down' | 'new' | 'timed'
export interface ExerciseScore { name: string; trend: Trend; points: number; done: number; planned: number; best?: SetDone; prevBest?: SetDone }

const oneRm = (s: SetDone) => s.weightKg * (1 + repsNumber(s.reps) / 30)
const strength = (s: SetDone, bodyweight: boolean) => (bodyweight ? repsNumber(s.reps) : oneRm(s))

export function bestSet(sets: (SetDone | null)[]): SetDone | undefined {
  const done = sets.filter((s): s is SetDone => !!s)
  const bodyweight = done.every((s) => s.weightKg === 0)
  return done.reduce<SetDone | undefined>((b, s) => (!b || strength(s, bodyweight) > strength(b, bodyweight) ? s : b), undefined)
}

export const POINTS: Record<Trend, number> = { up: 1, same: 0.7, new: 0.7, timed: 0.7, down: 0.4 }

export function exerciseScore(sessions: WorkoutSession[], date: string, e: SessionExercise, nth: number): ExerciseScore {
  const planned = e.sets.length
  const done = markedSets(e).length
  const best = bestSet(e.sets)
  const base = { name: e.name, done, planned, best }
  const ratio = planned ? done / planned : 0
  if (isCardio(e) || isTimed(e.reps)) return { ...base, trend: 'timed', points: POINTS.timed * ratio }

  const prevBest = bestSet(previousSets(sessions, date, e.exerciseId, nth))
  let trend: Trend = 'new'
  if (best && prevBest) {
    const bodyweight = best.weightKg === 0 && prevBest.weightKg === 0
    const a = strength(best, bodyweight)
    const b = strength(prevBest, bodyweight)
    trend = a === b || (b > 0 && Math.abs(a - b) / b < 0.01) ? 'same' : a > b ? 'up' : 'down'
  }
  return { ...base, prevBest, trend, points: POINTS[trend] * ratio }
}

const rowsOf = (sessions: WorkoutSession[], s: WorkoutSession) => s.exercises.map((e, i) => exerciseScore(sessions, s.date, e, nthOccurrence(s.exercises, i)))

export const PERF_WEIGHT = 0.7

export function sessionScore(sessions: WorkoutSession[], s: WorkoutSession) {
  const rows = rowsOf(sessions, s)
  const perf = rows.length ? (10 * rows.reduce((a, r) => a + r.points, 0)) / rows.length : 0
  const effort = s.effort
  const score = effort ? PERF_WEIGHT * perf + (1 - PERF_WEIGHT) * effort : perf
  return { score: Math.round(score * 10) / 10, perf, effort, rows }
}

export const upSoFar = (sessions: WorkoutSession[], s: WorkoutSession): number => rowsOf(sessions, s).filter((r) => r.done > 0 && r.trend === 'up').length
