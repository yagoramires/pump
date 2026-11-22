import { risers } from './loads'
import { pe } from '../../test/helpers'
import type { SessionExercise, WorkoutSession } from '../workout/types'

const today = '2026-11-19'
const sess = (date: string, exs: Partial<SessionExercise>[]): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T20:00:00.000Z`,
  exercises: exs.map((e) => ({ ...pe(), sets: [], ...e }) as SessionExercise),
})
const ex = (name: string, kg: number, reps = '10'): Partial<SessionExercise> => ({ exerciseId: name, name, muscles: ['peito'], sets: [{ weightKg: kg, reps }] })

test('só exercícios de carga que subiram, do maior pro menor delta, no máximo 3', () => {
  const log = [sess('2026-11-01', [ex('A', 50), ex('B', 40), ex('C', 30), ex('D', 20), ex('E', 10)]), sess('2026-11-15', [ex('A', 52), ex('B', 50), ex('C', 35), ex('D', 20), ex('E', 8)])]
  expect(risers(log, '90', today).map((r) => [r.name, r.top.delta])).toEqual([['B', 10], ['C', 5], ['A', 2]])
})
test('traz os topPoints pra sparkline', () => {
  const log = [sess('2026-11-01', [ex('A', 50)]), sess('2026-11-15', [ex('A', 55)])]
  expect(risers(log, '90', today)[0].topPoints).toEqual([{ date: '2026-11-01', value: 50 }, { date: '2026-11-15', value: 55 }])
})
test('exercício de reps não entra', () => {
  const log = [sess('2026-11-01', [ex('A', 0, '8')]), sess('2026-11-15', [ex('A', 0, '12')])]
  expect(risers(log, '90', today)).toEqual([])
})
