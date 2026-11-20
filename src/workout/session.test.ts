import {
  activeRest, changePlanRest, changeRestDuration, completeSession, completeUnfinishedSession, editSession, extendRest, holdsTrainingDay,
  reopenSession, restExerciseIndex, restRemainingSeconds, setDone, startSession, toggleRestPause, toggleSetWithRest,
} from './session'
import { workoutOf } from '../../test/helpers'

const SET = { reps: '10', weightKg: 40 }

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
test('completeSession marca a hora e encerra o descanso, correndo ou pausado', () => {
  const now = new Date(2026, 10, 16, 19)
  const s = startSession(workoutOf([{}]), '2026-11-16')
  const running = completeSession({ ...s, restEndsAt: 123 }, now)
  expect(running.completedAt).toBe(now.toISOString())
  expect(activeRest(running)).toBeUndefined()
  expect(activeRest(completeSession(toggleRestPause({ ...s, restEndsAt: 30_000 }, 0), now))).toBeUndefined()
})
test('editar séries depois mantém a hora do fim; desfazer na hora marca a nova', () => {
  const s = completeSession(startSession(workoutOf([{}]), '2026-11-16', new Date(2026, 10, 16, 18)), new Date(2026, 10, 16, 19))
  const edited = completeSession(editSession(s), new Date(2026, 10, 16, 22))
  expect(edited.completedAt).toBe(s.completedAt)
  expect(edited).not.toHaveProperty('editedFrom')
  const late = new Date(2026, 10, 16, 19, 30)
  expect(completeSession(reopenSession(s), late).completedAt).toBe(late.toISOString())
})
test('marcar inicia o descanso do exercício certo e desmarcar mantém o tempo que já corria', () => {
  const initial = startSession(workoutOf([{ restSec: 90 }, { restSec: 60 }]), '2026-11-16')
  const marked = toggleSetWithRest(initial, 1, 0, SET, 1_000)
  const unmarked = toggleSetWithRest(marked, 1, 0, SET, 15_000)
  expect(marked.exercises[1].sets[0]).toEqual(SET)
  expect(restExerciseIndex(marked)).toBe(1)
  expect(unmarked.exercises[1].sets[0]).toBeNull()
  expect(activeRest(unmarked)).toEqual({ paused: false, endAt: 61_000 })
})
test('restante vem do relógio, não de ticks', () => {
  const rest = { paused: false, endAt: 90_000 } as const
  expect(restRemainingSeconds(rest, 0)).toBe(90)
  expect(restRemainingSeconds(rest, 89_100)).toBe(1)
  expect(restRemainingSeconds(rest, 600_000)).toBe(0)
})
test('pausar congela o restante e continuar retoma a partir dele', () => {
  const s = toggleSetWithRest(startSession(workoutOf([{ restSec: 60 }]), '2026-11-16'), 0, 0, SET, 0)
  const paused = toggleRestPause(s, 20_000)
  expect(restRemainingSeconds(activeRest(paused)!, 50_000)).toBe(40)
  expect(activeRest(toggleRestPause(paused, 100_000))).toEqual({ paused: false, endAt: 140_000 })
})
test('+tempo soma ao restante, correndo ou pausado; sem descanso não faz nada', () => {
  const s = toggleSetWithRest(startSession(workoutOf([{ restSec: 60 }]), '2026-11-16'), 0, 0, SET, 0)
  expect(restRemainingSeconds(activeRest(extendRest(s, 15_000))!, 0)).toBe(75)
  expect(restRemainingSeconds(activeRest(extendRest(toggleRestPause(s, 20_000), 15_000))!, 0)).toBe(55)
  const idle = startSession(workoutOf([{}]), '2026-11-16')
  expect(extendRest(idle, 15_000)).toBe(idle)
})
test('mudar o tempo reinicia o descanso com ele e grava no exercício', () => {
  const s = toggleSetWithRest(startSession(workoutOf([{ restSec: 60 }, { restSec: 60 }]), '2026-11-16'), 0, 0, SET, 0)
  const changed = changeRestDuration(toggleRestPause(s, 10_000), 1, 120, 30_000)
  expect(activeRest(changed)).toEqual({ paused: false, endAt: 150_000 })
  expect(changed.exercises.map((e) => e.restSec)).toEqual([60, 120])
})
test('sessão antiga sem o exercício do descanso usa o primeiro incompleto', () => {
  const s = setDone(startSession(workoutOf([{ sets: 1 }, { sets: 1 }]), '2026-11-16'), 0, 0, SET)
  expect(restExerciseIndex({ ...s, restEndsAt: 1 })).toBe(1)
})
test('descanso novo vai pro plano na mesma ocorrência do exercício, mesmo com o plano reordenado', () => {
  const w = workoutOf([{ exerciseId: 'Supino', restSec: 60 }, { exerciseId: 'Rosca' }, { exerciseId: 'Supino', restSec: 60 }])
  const s = startSession(w, '2026-11-16')
  const edited = { workouts: [{ ...w, exercises: [w.exercises[1], w.exercises[0], w.exercises[2]] }] }
  expect(changePlanRest(edited, s, 2, 120).workouts[0].exercises.map((e) => e.restSec)).toEqual([90, 60, 120])
})

test('treino com série marcada segura o dia por até 6h do início', () => {
  const s = setDone(startSession(workoutOf([{}]), '2026-11-16', new Date(2026, 10, 16, 23)), 0, 0, SET)
  expect(holdsTrainingDay(s, new Date(2026, 10, 17, 4, 59))).toBe(true)
  expect(holdsTrainingDay(s, new Date(2026, 10, 17, 5, 1))).toBe(false)
  expect(holdsTrainingDay(setDone(s, 0, 0, null), new Date(2026, 10, 17, 0))).toBe(false)
  expect(holdsTrainingDay(completeSession(s, new Date(2026, 10, 17, 0)), new Date(2026, 10, 17, 0))).toBe(false)
})
test('concluir treino esquecido fecha às 23:59 do dia dele, sem duração', () => {
  const s = setDone(startSession(workoutOf([{}]), '2026-11-16', new Date(2026, 10, 16, 18)), 0, 0, SET)
  const done = completeUnfinishedSession(s)
  expect(done.completedAt).toBe(new Date(2026, 10, 16, 23, 59).toISOString())
  expect(done.startedAt).toBeUndefined()
})
