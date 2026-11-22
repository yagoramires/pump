import { exerciseHistory, exerciseVolume, loadPoints, previousSets, sessionStats, sessionVolume, suggestedKg } from './stats'
import { startSession } from './session'
import { trainingSessions } from './extra'
import { pe, workoutOf } from '../../test/helpers'
import type { SetDone, WorkoutSession } from './types'

test('volume usa o primeiro número das reps; sem número conta 0', () => {
  const s = startSession(workoutOf([{ sets: 3 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '10', weightKg: 10 }, { reps: '10-12', weightKg: 10 }, { reps: 'falha', weightKg: 10 }]
  expect(sessionVolume(s)).toBe(200)
})
test('sessionStats: feitas, total e tempo', () => {
  const s = { ...startSession(workoutOf([{ sets: 3 }, { sets: 2 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0)) }
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, { reps: '8-10', weightKg: 42.5 }, null]
  expect(sessionStats(s, new Date(2026, 10, 16, 18, 32))).toEqual({ done: 2, total: 5, minutes: 32 })
})
test('sessionStats: série pulada sai do total', () => {
  const s = startSession(workoutOf([{ sets: 2 }]), '2026-11-16')
  s.exercises[0] = { ...s.exercises[0], sets: [{ reps: '10', weightKg: 40 }, null], skipped: [1] }
  expect(sessionStats(s, new Date())).toMatchObject({ done: 1, total: 1 })
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
  expect(previousSets(Object.values(log), '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 40 }, null])
  expect(previousSets(Object.values(log), '2026-11-16', 'Outro')).toEqual([])
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
  expect(previousSets(Object.values(log), '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 40 }])
})
test('previousSets: no mesmo dia vale o treino mais tarde, não a ordem das chaves', () => {
  const at = (h: number) => new Date(2026, 10, 15, h, 0).toISOString()
  const mk = (workoutId: string, kg: number, h: number): WorkoutSession => ({
    date: '2026-11-15', workoutId, workoutLabel: 'A', workoutName: 'A', startedAt: at(h), completedAt: at(h + 1),
    exercises: [{ ...pe({ exerciseId: 'Supino' }), sets: [{ reps: '10', weightKg: kg }] }],
  })
  const log = trainingSessions({ '2026-11-15': mk('a', 80, 19) }, { '2026-11-15': mk('extra', 60, 7) })
  expect(previousSets(log, '2026-11-16', 'Supino')).toEqual([{ reps: '10', weightKg: 80 }])
  // hoje não conta como anterior, nem o extra de hoje
  expect(previousSets(trainingSessions({}, { '2026-11-16': { ...mk('extra', 60, 7), date: '2026-11-16' } }), '2026-11-16', 'Supino')).toEqual([])
})

test('exerciseVolume soma carga × reps das séries marcadas', () => {
  const s = startSession(workoutOf([{ sets: 3 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, null, { reps: '8-10', weightKg: 50 }]
  expect(exerciseVolume(s.exercises[0])).toBe(800)
})
test('exerciseVolume: por tempo não soma segundos como reps', () => {
  const s = startSession(workoutOf([{ reps: '45 s', sets: 3 }]), '2026-11-16')
  s.exercises[0].sets = [{ reps: '45 s', weightKg: 10 }, { reps: '45 s', weightKg: 10 }, null]
  expect(exerciseVolume(s.exercises[0])).toBe(0)
})
test('exercício repetido no treino: previousSets pega a mesma aparição e o histórico junta as séries', () => {
  const day = (date: string, ...kgs: number[]) => {
    const s = startSession(workoutOf(kgs.map(() => ({ exerciseId: 'Supino', sets: 1 }))), date)
    s.exercises.forEach((e, i) => { e.sets = [{ reps: '10', weightKg: kgs[i] }] })
    return s
  }
  const log = { '2026-11-12': day('2026-11-12', 30, 80) }
  expect(previousSets(Object.values(log), '2026-11-16', 'Supino', 1)).toEqual([{ reps: '10', weightKg: 80 }])
  expect(previousSets(Object.values(log), '2026-11-16', 'Supino', 2)).toEqual([{ reps: '10', weightKg: 30 }])
  const h = exerciseHistory([day('2026-11-12', 60, 80), day('2026-11-14', 70)])
  expect(loadPoints(h.get('Supino')!)).toEqual([{ date: '2026-11-12', value: 80 }, { date: '2026-11-14', value: 70 }])
})
test('carga sugerida: mesma série do último treino, a primeira feita no cabeçalho, senão a do plano', () => {
  const prev = [null, { reps: '10', weightKg: 30 }]
  expect(suggestedKg({ weightKg: 20 }, prev, 1)).toBe(30)
  expect(suggestedKg({ weightKg: 20 }, prev, 0)).toBe(20)
  expect(suggestedKg({ weightKg: 20 }, prev)).toBe(30)
  expect(suggestedKg({ weightKg: 20 }, [])).toBe(20)
})

test('exerciseHistory e loadPoints: só exercício feito, sem cardio/tempo, e 0 kg não é carga', () => {
  const day = (date: string, kg: number) => {
    const s = startSession(workoutOf([{ exerciseId: 'agacho' }, { exerciseId: 'prancha', reps: '30s' }, { exerciseId: 'remada' }]), date)
    s.exercises[0].sets = [{ reps: '10', weightKg: kg }, null, null]
    s.exercises[1].sets = [{ reps: '30s', weightKg: 0 }, null, null]
    return s
  }
  const h = exerciseHistory([day('2026-11-01', 0), day('2026-11-08', 40)])
  expect([...h.keys()]).toEqual(['agacho'])
  expect(loadPoints(h.get('agacho')!)).toEqual([{ date: '2026-11-08', value: 40 }])
})


test('duração termina na última série, não na conclusão', () => {
  const s = startSession(workoutOf([{ sets: 1 }]), '2026-11-16', new Date(2026, 10, 16, 18, 0))
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }]
  const endedAt = new Date(2026, 10, 16, 18, 50).toISOString()
  expect(sessionStats({ ...s, endedAt, completedAt: new Date(2026, 10, 16, 21, 0).toISOString() }).minutes).toBe(50)
  expect(sessionStats({ ...s, endedAt }, new Date(2026, 10, 16, 19, 30)).minutes).toBe(50)
  s.exercises[0].sets = [{ reps: '10', weightKg: 40 }, null]
  expect(sessionStats({ ...s, endedAt }, new Date(2026, 10, 16, 19, 30)).minutes).toBe(90)
})
