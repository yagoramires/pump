import { exerciseLoads, loadsSummary } from './loads'
import { pe } from '../../test/helpers'
import type { SessionExercise, SetDone, WorkoutSession } from '../workout/types'

const today = '2026-11-19'
const sess = (date: string, exs: Partial<SessionExercise>[], done = true): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', ...(done && { completedAt: `${date}T20:00:00.000Z` }),
  exercises: exs.map((e) => ({ ...pe(), sets: [], ...e }) as SessionExercise),
})
const logOf = (...ss: WorkoutSession[]): WorkoutSession[] => ss
const set = (weightKg: number, reps = '10'): SetDone => ({ weightKg, reps })
const supino = (sets: (SetDone | null)[], over: Partial<SessionExercise> = {}) => ({ exerciseId: 'Supino', name: 'Supino', muscles: ['peito'], sets, ...over })
const rows = (log: WorkoutSession[], p: '30' | '90' | 'all' = 'all') => loadsSummary(log, p, today).groups.flatMap((g) => g.rows)

test('carga máx e volume comparam o primeiro e o último treino do período', () => {
  const log = logOf(sess('2026-11-01', [supino([set(50), set(55)])]), sess('2026-11-15', [supino([set(60, '8'), set(60, '8')])]))
  const s = loadsSummary(log, '90', today)
  expect(s.groups[0]).toMatchObject({ token: 'c2', label: 'Peito' })
  expect(s.groups[0].rows[0]).toEqual({ exerciseId: 'Supino', name: 'Supino', mode: 'load', sessions: 2, top: { last: 60, delta: 5 }, total: { last: 960, delta: -90 } })
})
test('período inclui a borda de N dias e exclui o dia seguinte', () => {
  const log = logOf(sess('2026-10-20', [supino([set(50)])]), sess('2026-10-19', [supino([set(40)])]))
  expect(rows(log, '30')[0]).toMatchObject({ sessions: 1, top: { last: 50 } })
  expect(rows(log, '30')[0].top.delta).toBeUndefined()
  expect(rows(log, 'all')[0].sessions).toBe(2)
})
test('ignora treino não finalizado', () => {
  const log = logOf(sess('2026-11-15', [supino([set(60)])]), sess(today, [supino([set(90)])], false))
  expect(rows(log)[0]).toMatchObject({ sessions: 1, top: { last: 60 } })
})
test('só séries marcadas contam', () => {
  const r = rows(logOf(sess('2026-11-15', [supino([set(80), null])])))[0]
  expect(r.top.last).toBe(80)
  expect(r.total.last).toBe(800)
})
test('cardio e exercício por tempo ficam de fora', () => {
  const log = logOf(sess('2026-11-15', [
    { exerciseId: 'Esteira', name: 'Esteira', sets: [set(0, '20 min')], reps: '20 min' },
    { exerciseId: 'Prancha', name: 'Prancha', reps: '30 s', sets: [set(0, '30'), set(0, '30')] },
  ]))
  expect(loadsSummary(log, 'all', today).groups).toEqual([])
})
test('peso do corpo usa reps', () => {
  const barra = (sets: SetDone[]) => ({ exerciseId: 'Barra', name: 'Barra', sets })
  const log = logOf(sess('2026-11-01', [barra([set(0, '8'), set(0, '6')])]), sess('2026-11-15', [barra([set(0, '10'), set(0, '9')])]))
  expect(rows(log)[0]).toMatchObject({ mode: 'reps', top: { last: 10, delta: 2 }, total: { last: 19, delta: 5 } })
  expect(loadsSummary(log, 'all', today)).toMatchObject({ top: { up: 0, down: 0, same: 0 }, total: { up: 0, down: 0, same: 0 } })
})
test('com lastro no período usa carga e ignora sessões a 0 kg', () => {
  const barra = (sets: SetDone[]) => ({ exerciseId: 'Barra', name: 'Barra', sets })
  const r = rows(logOf(sess('2026-11-01', [barra([set(0, '10')])]), sess('2026-11-15', [barra([set(10, '6')])])))[0]
  expect(r).toMatchObject({ mode: 'load', sessions: 1, top: { last: 10 } })
  expect(r.top.delta).toBeUndefined()
})
test('exercício repetido no mesmo treino junta as séries das aparições', () => {
  expect(rows(logOf(sess('2026-11-15', [supino([set(60)]), supino([set(90)])])))[0].top.last).toBe(90)
})
test('exercício repetido: ocorrência sem série marcada não atrapalha', () => {
  const r = rows(logOf(sess('2026-11-15', [supino([null]), supino([set(60)]), supino([set(90)])])))[0]
  expect(r.top.last).toBe(90)
  expect(r.sessions).toBe(1)
})
test('agrupa por grupo muscular na ordem fixa; sem músculo e pescoço vão para Outros', () => {
  const ex = (id: string, muscles: string[]) => ({ exerciseId: id, name: id, muscles, sets: [set(10)] })
  const s = loadsSummary(logOf(sess('2026-11-15', [ex('A', ['quadríceps']), ex('B', ['peito']), ex('C', []), ex('D', ['pescoço'])])), 'all', today)
  expect(s.groups.map((g) => g.label)).toEqual(['Peito', 'Pernas', 'Outros'])
  expect(s.groups[2].rows).toHaveLength(2)
})
test('dentro do grupo, mais treinados primeiro', () => {
  const cruc = { exerciseId: 'Crucifixo', name: 'Crucifixo', muscles: ['peito'], sets: [set(10)] }
  const log = logOf(sess('2026-11-01', [cruc]), sess('2026-11-08', [cruc]), sess('2026-11-15', [cruc, supino([set(60)])]))
  expect(rows(log).map((r) => r.name)).toEqual(['Crucifixo', 'Supino'])
})
test('resumo conta subidas, quedas e iguais; ignora linhas com um treino só', () => {
  const mk = (id: string, a: number, b: number) => [{ exerciseId: id, name: id, sets: [set(a)] }, { exerciseId: id, name: id, sets: [set(b)] }]
  const log = logOf(
    sess('2026-11-01', [mk('U', 10, 15)[0], mk('D', 10, 8)[0], mk('S', 10, 10)[0]]),
    sess('2026-11-15', [mk('U', 10, 15)[1], mk('D', 10, 8)[1], mk('S', 10, 10)[1], { exerciseId: 'Solo', name: 'Solo', sets: [set(5)] }]),
  )
  expect(loadsSummary(log, 'all', today).top).toEqual({ up: 1, down: 1, same: 1 })
})
test('exerciseLoads devolve pontos em ordem de data e histórico do mais recente', () => {
  const log = logOf(sess('2026-11-01', [supino([set(55)])]), sess('2026-11-15', [supino([set(60), null])]))
  const e = exerciseLoads(log, 'Supino', 'all', today)!
  expect(e.topPoints).toEqual([{ date: '2026-11-01', value: 55 }, { date: '2026-11-15', value: 60 }])
  expect(e.history[0].date).toBe('2026-11-15')
  expect(e.history[0].sets).toEqual([set(60)])
})
test('exerciseLoads de exercício sem treino no período é undefined', () => {
  expect(exerciseLoads(logOf(), 'Supino', 'all', today)).toBeUndefined()
})
