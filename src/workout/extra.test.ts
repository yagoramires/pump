import { ex, pe } from '../../test/helpers'
import type { WorkoutLog, WorkoutSession } from './types'
import { addExtraExercise, removeExercise, startActivity, startCardio, startExtra, switchCardio, trainingSessions, unfinishedExtra } from './extra'
import { completedSessions, previousSets } from './stats'

const done = (date: string, id = 'w', marked = true): WorkoutSession => ({
  date, workoutId: id, workoutLabel: 'A', workoutName: 'T', completedAt: `${date}T10:00:00Z`,
  exercises: [{ ...pe({ exerciseId: 'Supino' }), sets: [marked ? { reps: '8', weightKg: 50 } : null] }],
})

test('addExtraExercise cria as séries vazias com os padrões', () => {
  const [e] = addExtraExercise(startExtra('2026-11-21'), ex('Supino'), 4).exercises
  expect(e.sets).toEqual([null, null, null, null])
  expect(e.reps).toBe('10-12')
  expect(e.restSec).toBe(90)
})

test('removeExercise limpa o descanso', () => {
  const s = addExtraExercise({ ...startExtra('2026-11-21'), restEndsAt: 5, restExIdx: 0 }, ex('Supino'), 3)
  const r = removeExercise(s, 0)
  expect(r.exercises).toEqual([])
  expect(r.restEndsAt).toBeUndefined()
})

const log: WorkoutLog = { '2026-11-20': done('2026-11-20') }
const extra: WorkoutLog = { '2026-11-20': done('2026-11-20', 'extra') }

test('ficha e extra do mesmo dia contam as duas', () => {
  expect(completedSessions(trainingSessions(log, extra))).toHaveLength(2)
})

test('previousSets enxerga o extra de dias anteriores, não o de hoje', () => {
  const only = trainingSessions({}, extra)
  expect(previousSets(only, '2026-11-21', 'Supino')).toEqual([{ reps: '8', weightKg: 50 }])
  expect(previousSets(only, '2026-11-20', 'Supino')).toEqual([])
})

test('unfinishedExtra', () => {
  const open = (date: string, marked: boolean) => ({ ...done(date, 'extra', marked), completedAt: undefined })
  expect(unfinishedExtra({ '2026-11-21': open('2026-11-21', true) }, '2026-11-21')).toBeUndefined()
  expect(unfinishedExtra({ '2026-11-20': open('2026-11-20', false) }, '2026-11-21')).toBeUndefined()
  expect(unfinishedExtra({ '2026-11-20': open('2026-11-20', true) }, '2026-11-21')?.date).toBe('2026-11-20')
})

test('trocar a atividade de uma sessão avulsa troca o nome do treino junto', () => {
  const futebol = startActivity('2026-11-21', { exerciseId: 'esporte-futebol', name: 'Futebol' }, 60)
  expect(futebol).toMatchObject({ workoutName: 'Futebol', exercises: [{ name: 'Futebol', reps: '60 min' }] })
  const tenis = switchCardio(futebol, 0, { exerciseId: 'esporte-tenis', name: 'Tênis' })
  expect(tenis).toMatchObject({ workoutName: 'Tênis', exercises: [{ name: 'Tênis', reps: '60 min' }] })
  const ficha = startCardio('2026-11-21', [pe({ exerciseId: 'esteira', name: 'Esteira', sets: 1, reps: '15 min' })])
  expect(switchCardio(ficha, 0, { exerciseId: 'esporte-tenis', name: 'Tênis' }).workoutName).toBe('Somente cardio')
})
