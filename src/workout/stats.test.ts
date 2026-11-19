import { exerciseVolume, previousSets, sessionStats } from './stats'
import { startSession } from './session'
import { pe, workoutOf } from '../../test/helpers'
import type { SetDone } from './types'

test('volume usa o primeiro número das reps; sem número conta 0', () => {
  const s = startSession(workoutOf([{ sets: 3 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '10', weightKg: 10 }, { reps: '10-12', weightKg: 10 }, { reps: 'falha', weightKg: 10 }]
  expect(sessionStats(s, new Date()).volumeKg).toBe(200)
})
test('sessionStats: feitas, total, volume e tempo', () => {
  const s = { ...startSession(workoutOf([{ sets: 3 }, { sets: 2 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0)) }
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, { reps: '8-10', weightKg: 42.5 }, null]
  expect(sessionStats(s, new Date(2026, 10, 16, 18, 32))).toEqual({ done: 2, total: 5, volumeKg: 740, minutes: 32 })
})
test('sessionStats sem startedAt (sessão antiga) não tem tempo', () => {
  const s = startSession(workoutOf([{ sets: 1 }]), '2026-11-16'); delete s.startedAt
  expect(sessionStats(s, new Date()).minutes).toBeNull()
})
test('sessionStats congela o tempo em completedAt', () => {
  const s = { ...startSession(workoutOf([{ sets: 1 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0)), completedAt: new Date(2026, 10, 16, 18, 50).toISOString() }
  expect(sessionStats(s, new Date(2026, 10, 16, 23, 0)).minutes).toBe(50)
})
test('previousSets pega a sessão anterior mais recente com o exercício', () => {
  const mk = (date: string, sets: (SetDone | null)[]) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [{ ...pe({ exerciseId: 'Supino' }), sets }] })
  const log = { '2026-11-09': mk('2026-11-09', [{ reps: '8', weightKg: 35 }]), '2026-11-12': mk('2026-11-12', [{ reps: '10', weightKg: 40 }, null]), '2026-11-16': mk('2026-11-16', [{ reps: '12', weightKg: 45 }]) }
  expect(previousSets(log, '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 40 }, null])
  expect(previousSets(log, '2026-11-16', 'Outro')).toEqual([])
})
test('sessionStats: startedAt ilegível dá null e tempo negativo vira 0', () => {
  const s = { ...startSession(workoutOf([{ sets: 1 }]), '2026-11-16'), startedAt: 'lixo' }
  expect(sessionStats(s, new Date()).minutes).toBeNull()
  const fut = startSession(workoutOf([{ sets: 1 }]), '2026-11-16', new Date(2026, 10, 16, 19, 0))
  expect(sessionStats(fut, new Date(2026, 10, 16, 18, 0)).minutes).toBe(0)
})
test('previousSets ignora sessão anterior sem série marcada', () => {
  const mk = (date: string, sets: (SetDone | null)[]) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [{ ...pe({ exerciseId: 'Supino' }), sets }] })
  const log = { '2026-11-12': mk('2026-11-12', [{ reps: '10', weightKg: 40 }]), '2026-11-14': mk('2026-11-14', [null, null]) }
  expect(previousSets(log, '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 40 }])
})

test('exerciseVolume soma carga × reps das séries marcadas', () => {
  const s = startSession(workoutOf([{ sets: 3 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, null, { reps: '8-10', weightKg: 50 }]
  expect(exerciseVolume(s.exercises[0])).toBe(800)
})
