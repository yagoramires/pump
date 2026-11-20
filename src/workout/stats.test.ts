import { exerciseHistory, exerciseVolume, loadPoints, previousSets, sessionRecords, sessionStats, suggestedKg, volumeChange } from './stats'
import { startSession } from './session'
import { pe, workoutOf } from '../../test/helpers'
import type { SetDone, WorkoutLog, WorkoutSession } from './types'

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

describe('resumo do treino concluído', () => {
  const NAMES: Record<string, string> = { Supino: 'Supino reto', Remada: 'Remada', Barra: 'Barra fixa' }
  const sx = (date: string, workoutId: string, exs: Record<string, number[]>): WorkoutSession => ({
    date, workoutId, workoutLabel: workoutId.toUpperCase(), workoutName: '', completedAt: `${date}T10:00:00`,
    exercises: Object.entries(exs).map(([id, kgs]) => ({ ...pe({ exerciseId: id, name: NAMES[id] ?? id }), sets: kgs.map((weightKg) => ({ reps: '10', weightKg })) })),
  })
  const esteira = (s: WorkoutSession, kg: number): WorkoutSession => ({
    ...s, exercises: [...s.exercises, { ...pe({ exerciseId: 'Esteira', name: 'Esteira', reps: '20 min' }), sets: [{ reps: '20 min', weightKg: kg }] }],
  })
  const logOf = (...ss: WorkoutSession[]): WorkoutLog => Object.fromEntries(ss.map((s) => [s.date, s]))

  test('volumeChange compara com o último do mesmo treino', () => {
    const hoje = sx('2026-11-16', 'a', { Supino: [27, 27, 27, 27] })
    const log = logOf(sx('2026-11-10', 'a', { Supino: [10] }), sx('2026-11-12', 'a', { Supino: [25, 25, 25, 25] }), sx('2026-11-14', 'b', { Supino: [100] }), hoje)
    expect(volumeChange(log, hoje)).toBe(8)
  })
  test('volumeChange sem anterior ou com anterior a 0 kg → undefined', () => {
    const hoje = sx('2026-11-16', 'a', { Supino: [27] })
    expect(volumeChange(logOf(hoje), hoje)).toBeUndefined()
    expect(volumeChange(logOf(sx('2026-11-12', 'a', { Barra: [0] }), hoje), hoje)).toBeUndefined()
  })
  test('sessionRecords: passa a maior carga anterior; primeira vez e cardio não contam', () => {
    const hoje = esteira(sx('2026-11-16', 'a', { Supino: [80, 75], Remada: [50] }), 5)
    const log = logOf(sx('2026-11-10', 'a', { Supino: [70] }), esteira(sx('2026-11-12', 'b', { Supino: [75, 75] }), 3), hoje)
    expect(sessionRecords(log, hoje)).toEqual([{ name: 'Supino reto', kg: 80, prevKg: 75 }])
  })
  test('sessionRecords: igualar a carga não é recorde; só peso do corpo → []', () => {
    const hoje = sx('2026-11-16', 'a', { Supino: [80], Barra: [0] })
    expect(sessionRecords(logOf(sx('2026-11-12', 'a', { Supino: [80], Barra: [0] }), hoje), hoje)).toEqual([])
  })
})
