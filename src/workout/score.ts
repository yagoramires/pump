import { isCardio, isTimed, repsNumber } from './reps'
import { isSkipped } from './session'
import { previousSets } from './stats'
import type { SessionExercise, SetDone, WorkoutLog, WorkoutSession } from './types'

export type Trend = 'up' | 'same' | 'down' | 'new' | 'timed'
export interface ExerciseScore { name: string; trend: Trend; points: number; done: number; planned: number; best?: SetDone; prevBest?: SetDone }

const oneRm = (s: SetDone) => s.weightKg * (1 + repsNumber(s.reps) / 30)
// sem carga (peso do corpo) a força é só o número de repetições
const strength = (s: SetDone, bodyweight: boolean) => (bodyweight ? repsNumber(s.reps) : oneRm(s))

export function bestSet(sets: (SetDone | null)[]): SetDone | undefined {
  const done = sets.filter((s): s is SetDone => !!s)
  const bodyweight = done.every((s) => s.weightKg === 0)
  return done.reduce<SetDone | undefined>((b, s) => (!b || strength(s, bodyweight) > strength(b, bodyweight) ? s : b), undefined)
}

const POINTS: Record<Trend, number> = { up: 1, same: 0.7, new: 0.7, timed: 0.7, down: 0.4 }

export function exerciseScore(log: WorkoutLog, date: string, e: SessionExercise, nth: number): ExerciseScore {
  const planned = e.sets.length
  const done = e.sets.filter((s, i) => s && !isSkipped(e, i)).length
  const best = bestSet(e.sets)
  const base = { name: e.name, done, planned, best }
  const ratio = planned ? done / planned : 0
  if (isCardio(e) || isTimed(e.reps)) return { ...base, trend: 'timed', points: POINTS.timed * ratio }

  const prevBest = bestSet(previousSets(log, date, e.exerciseId, nth))
  let trend: Trend = 'new'
  if (best && prevBest) {
    const bodyweight = best.weightKg === 0 && prevBest.weightKg === 0
    const a = strength(best, bodyweight)
    const b = strength(prevBest, bodyweight)
    trend = b > 0 && Math.abs(a - b) / b < 0.01 ? 'same' : a > b ? 'up' : 'down'
  }
  return { ...base, prevBest, trend, points: POINTS[trend] * ratio }
}

const rowsOf = (log: WorkoutLog, s: WorkoutSession) =>
  s.exercises.map((e, i) => exerciseScore(log, s.date, e, s.exercises.slice(0, i).filter((x) => x.exerciseId === e.exerciseId).length))

export function sessionScore(log: WorkoutLog, s: WorkoutSession) {
  const rows = rowsOf(log, s)
  const perf = rows.length ? (10 * rows.reduce((a, r) => a + r.points, 0)) / rows.length : 0
  const effort = s.effort
  const score = effort ? 0.7 * perf + 0.3 * effort : perf
  const count = (t: Trend) => rows.filter((r) => r.trend === t).length
  return { score: Math.round(score * 10) / 10, perf, effort, up: count('up'), same: count('same'), down: count('down'), rows }
}

export const upSoFar = (log: WorkoutLog, s: WorkoutSession): number => rowsOf(log, s).filter((r) => r.done > 0 && r.trend === 'up').length
