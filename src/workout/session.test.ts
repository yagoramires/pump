import { completeSession, setDone, startSession } from './session'
import { workoutOf } from '../../test/helpers'

test('sessão é cópia completa: editar o plano depois não muda a sessão', () => {
  const w = workoutOf([{ exerciseId: 'Supino', name: 'Supino reto', sets: 4, reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg'] }], { label: 'A', name: 'Peito' })
  const s = startSession(w, '2026-11-16')
  w.exercises[0].name = 'Outro'; w.exercises[0].reps = '5'; w.exercises[0].images.push('Z.jpg'); w.exercises.splice(0, 1)
  expect(s).toMatchObject({ workoutLabel: 'A', workoutName: 'Peito' })
  expect(s.exercises[0]).toMatchObject({ exerciseId: 'Supino', name: 'Supino reto', reps: '10', weightKg: 40, restSec: 60, images: ['S/0.jpg'], sets: [null, null, null, null] })
})
test('setDone marca e desmarca sem mutar; o mesmo exercício duas vezes fica separado', () => {
  const s0 = startSession(workoutOf([{ exerciseId: 'Rosca', sets: 2 }, { exerciseId: 'Rosca', sets: 2 }]), '2026-11-16')
  const s1 = setDone(s0, 1, 0, { reps: '10', weightKg: 12 })
  expect(s0.exercises[1].sets[0]).toBeNull()
  expect(s1.exercises[0].sets).toEqual([null, null])
  expect(s1.exercises[1].sets).toEqual([{ reps: '10', weightKg: 12 }, null])
  expect(setDone(s1, 1, 0, null).exercises[1].sets[0]).toBeNull()
})
test('completeSession marca a hora e encerra o descanso', () => {
  const now = new Date(2026, 10, 16, 19)
  const c = completeSession({ ...startSession(workoutOf([{}]), '2026-11-16'), restEndsAt: 123 }, now)
  expect(c.completedAt).toBe(now.toISOString()); expect(c.restEndsAt).toBeUndefined()
})
test('startSession grava startedAt', () => {
  const now = new Date(2026, 10, 16, 18, 0)
  expect(startSession(workoutOf([]), '2026-11-16', now).startedAt).toBe(now.toISOString())
})
test('completeSession também limpa um descanso pausado', () => {
  const s = { ...startSession(workoutOf([{}]), '2026-11-16'), restPausedLeftMs: 30_000, restExIdx: 0 }
  expect(completeSession(s, new Date(2026, 10, 16, 19))).toMatchObject({ restPausedLeftMs: undefined, restExIdx: undefined, restEndsAt: undefined })
})
