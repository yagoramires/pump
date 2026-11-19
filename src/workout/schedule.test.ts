import { nextWorkout, unfinishedSession } from './schedule'
import { restRecord } from './rest'
import { planOf } from '../../test/helpers'
import type { WorkoutLog, WorkoutSession } from './types'

const plan = (labels: string[]) => planOf(labels.map((l) => ({ id: l, label: l })))
const p = plan(['A', 'B', 'C'])
const sess = (date: string, label: string, over: Partial<WorkoutSession> = {}): WorkoutSession => ({ date, workoutId: label, workoutLabel: label, workoutName: label, exercises: [], ...over })
const done = (date: string, label: string) => sess(date, label, { completedAt: `${date}T10:00:00` })
const open = (date: string, label: string) => sess(date, label)
const log = (...ss: WorkoutSession[]): WorkoutLog => Object.fromEntries(ss.map((s) => [s.date, s]))
const withSet = (s: WorkoutSession, marked: boolean): WorkoutSession => ({
  ...s,
  exercises: [{ exerciseId: 'X', name: 'X', muscles: [], images: [], instructions: [], equipment: '', reps: '10', weightKg: 0, restSec: 90, sets: [marked ? { reps: '10', weightKg: 0 } : null, null] } as never],
})

test('sem sessão concluída, o primeiro', () => expect(nextWorkout(p, {})?.label).toBe('A'))
test('segue a ordem e volta ao primeiro', () => {
  expect(nextWorkout(p, log(done('2026-11-16', 'A')))?.label).toBe('B')
  expect(nextWorkout(p, log(done('2026-11-16', 'C')))?.label).toBe('A')
})
test('faltar dias não pula treino', () => expect(nextWorkout(p, log(done('2026-11-10', 'A')))?.label).toBe('B'))
test('sessão aberta não conta; descanso não conta', () =>
  expect(nextWorkout(p, log(done('2026-11-16', 'A'), open('2026-11-17', 'B'), restRecord('2026-11-18')))?.label).toBe('B'))
test('treino da última sessão saiu da ficha → primeiro', () => expect(nextWorkout(plan(['A', 'B']), log(done('2026-11-16', 'Z')))?.label).toBe('A'))
test('ficha vazia → undefined', () => expect(nextWorkout({ workouts: [] }, {})).toBeUndefined())
test('trocou para outro treino e concluiu → o próximo segue a partir dele', () =>
  expect(nextWorkout(plan(['A', 'B', 'C', 'D', 'E']), log(done('2026-11-19', 'D')))?.label).toBe('E'))
describe('start (escolhido no import)', () => {
  const comStart = (since: string, label = 'C') => ({ ...p, start: { label, since } })
  test('sem treino concluído depois do import, vale o escolhido', () =>
    expect(nextWorkout(comStart('2026-11-18T12:00:00'), log(done('2026-11-17', 'A')))?.label).toBe('C'))
  test('treino concluído no mesmo dia, antes do import, não cancela', () =>
    expect(nextWorkout(comStart('2026-11-18T20:00:00'), log(done('2026-11-18', 'A')))?.label).toBe('C'))
  test('depois do primeiro treino concluído após o import, volta a regra normal', () =>
    expect(nextWorkout(comStart('2026-11-18T08:00:00'), log(done('2026-11-18', 'C')))?.label).toBe('A'))
  test('pendente de ontem concluído depois (23:59 do dia antigo) não cancela', () =>
    expect(nextWorkout(comStart('2026-11-18T08:00:00'), log(sess('2026-11-17', 'A', { completedAt: '2026-11-17T23:59:00' })))?.label).toBe('C'))
  test('letra que não existe mais → regra normal', () =>
    expect(nextWorkout(comStart('2026-11-18T08:00:00', 'Z'), log(done('2026-11-17', 'A')))?.label).toBe('B'))
})
test('unfinishedSession: só dia anterior, com série marcada, não concluída', () => {
  expect(unfinishedSession(log(withSet(open('2026-11-18', 'A'), true)), '2026-11-18')).toBeUndefined()
  expect(unfinishedSession(log(withSet(open('2026-11-17', 'A'), false)), '2026-11-18')).toBeUndefined()
  expect(unfinishedSession(log({ ...withSet(open('2026-11-17', 'A'), true), completedAt: 'x' }), '2026-11-18')).toBeUndefined()
  expect(unfinishedSession(log(withSet(open('2026-11-17', 'A'), true)), '2026-11-18')?.date).toBe('2026-11-17')
  expect(unfinishedSession(log(withSet(open('2026-11-10', 'A'), true), withSet(open('2026-11-15', 'B'), true)), '2026-11-18')?.date).toBe('2026-11-15')
})
test('unfinishedSession: sessão aberta anterior a uma concluída fica como está', () => {
  expect(unfinishedSession(log(withSet(open('2026-11-10', 'A'), true), done('2026-11-12', 'B')), '2026-11-18')).toBeUndefined()
  const l = log(withSet(open('2026-11-10', 'A'), true), done('2026-11-12', 'B'), withSet(open('2026-11-15', 'C'), true))
  expect(unfinishedSession(l, '2026-11-18')?.date).toBe('2026-11-15')
  const { '2026-11-15': _x, ...resolved } = l
  expect(unfinishedSession({ ...resolved, '2026-11-15': done('2026-11-15', 'C') }, '2026-11-18')).toBeUndefined()
})
