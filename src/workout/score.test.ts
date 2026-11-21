import { describe, expect, it } from 'vitest'
import { bestSet, exerciseScore, sessionScore, upSoFar } from './score'
import { trainingLog } from './extra'
import type { SessionExercise, SetDone, WorkoutLog, WorkoutSession } from './types'
import { pe } from '../../test/helpers'

const ex = (kg: number, reps: string, over: Partial<SessionExercise> = {}, n = 3): SessionExercise =>
  ({ ...pe({ reps }), sets: Array(n).fill({ weightKg: kg, reps } as SetDone), ...over })
const sess = (date: string, exercises: SessionExercise[], effort?: number): WorkoutSession =>
  ({ date, workoutId: 'w', workoutLabel: 'A', workoutName: 'A', exercises, effort })
const logOf = (...ss: WorkoutSession[]): WorkoutLog => Object.fromEntries(ss.map((s) => [s.date, s]))

describe('bestSet', () => {
  it('escolhe pelo 1RM estimado', () => {
    expect(bestSet([{ weightKg: 40, reps: '10' }, { weightKg: 42.5, reps: '8' }])).toEqual({ weightKg: 42.5, reps: '8' })
  })
  it('sem carga, mais repetições', () => {
    expect(bestSet([{ weightKg: 0, reps: '10' }, { weightKg: 0, reps: '12' }])?.reps).toBe('12')
  })
})

describe('sessionScore', () => {
  const prev = sess('2026-01-01', [ex(40, '10')])
  it('igual, com esforço 7, dá 7', () => {
    expect(sessionScore(logOf(prev), sess('2026-01-02', [ex(40, '10')], 7)).score).toBe(7)
  })
  it('tudo subiu com esforço 9 dá 9,7; sem esforço 10', () => {
    expect(sessionScore(logOf(prev), sess('2026-01-02', [ex(50, '10')], 9)).score).toBe(9.7)
    expect(sessionScore(logOf(prev), sess('2026-01-02', [ex(50, '10')])).score).toBe(10)
  })
  it('sem exercícios dá 0', () => {
    expect(sessionScore({}, sess('2026-01-02', [])).score).toBe(0)
  })
  it('conta quantos subiram', () => {
    const s = sess('2026-01-02', [ex(50, '10')])
    expect(sessionScore(logOf(prev), s)).toMatchObject({ up: 1, same: 0, down: 0 })
    expect(upSoFar(logOf(prev), s)).toBe(1)
  })
})

describe('exerciseScore', () => {
  const prev = sess('2026-01-01', [ex(40, '10')])
  const score = (e: SessionExercise, log = logOf(prev)) => exerciseScore(log, '2026-01-02', e, 0)
  it('primeira vez é new, 0.7', () => {
    expect(exerciseScore({}, '2026-01-02', ex(40, '10'), 0)).toMatchObject({ trend: 'new', points: 0.7 })
  })
  it('queda vale 0.4', () => expect(score(ex(30, '10'))).toMatchObject({ trend: 'down', points: 0.4 }))
  it('metade pulada com a mesma carga vale 0.35', () => {
    const e = ex(40, '10', { skipped: [2] }, 4)
    e.sets[2] = null
    e.sets[3] = null
    e.skipped = [2, 3]
    expect(score(e)).toMatchObject({ trend: 'same', points: 0.35, done: 2, planned: 4 })
  })
  it('peso do corpo: 12 depois de 10 sobe', () => {
    expect(score(ex(0, '12'), logOf(sess('2026-01-01', [ex(0, '10')])))).toMatchObject({ trend: 'up' })
  })
  it('cardio feito é timed, 0.7', () => {
    expect(score(ex(0, '20 min', {}, 1))).toMatchObject({ trend: 'timed', points: 0.7 })
  })
  it('compara com extra do dia anterior via trainingLog', () => {
    const log = trainingLog({}, { '2026-01-01': prev })
    expect(score(ex(50, '10'), log).trend).toBe('up')
  })
})
