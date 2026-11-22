import { goalStreak, weeklyBars } from './consistency'
import { pe } from '../../test/helpers'
import { addDays, mondayWeekStart } from '@/lib/date'
import type { SessionExercise, SetDone, WorkoutSession } from '../workout/types'

const today = '2026-11-19' // quinta; segundas: 02/11, 09/11, 16/11
const set = (weightKg: number, reps = '10'): SetDone => ({ weightKg, reps })
const supino = (sets: (SetDone | null)[]) => ({ exerciseId: 'Supino', name: 'Supino', muscles: ['peito'], sets })
const sess = (date: string, exs: Partial<SessionExercise>[] = [supino([set(60)])]): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T20:00:00.000Z`,
  exercises: exs.map((e) => ({ ...pe(), sets: [], ...e }) as SessionExercise),
})
/** uma semana (seg–dom) por número, com essa quantidade de dias treinados; a última é a anterior à semana de `ref` */
const streakLog = (perWeek: number[], ref = '2026-11-23') => {
  const first = addDays(mondayWeekStart(ref), -7 * perWeek.length)
  return perWeek.flatMap((n, w) => Array.from({ length: n }, (_, d) => sess(addDays(first, w * 7 + d))))
}

test('semanas antes do primeiro treino não aparecem', () => {
  const { bars } = weeklyBars([sess('2026-11-04'), sess('2026-11-12')], 3, today)
  expect(bars.map((b) => b.start)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
})
test('limita a 12 semanas e ratio não passa de 1', () => {
  const ss = Array.from({ length: 120 }, (_, i) => sess(addDays(today, -i)))
  const { bars } = weeklyBars(ss, 3, today)
  expect(bars).toHaveLength(12)
  expect(bars.every((b) => b.ratio === 1)).toBe(true)
})
test('semana sem treino entra com 0', () => {
  const { bars } = weeklyBars([sess('2026-11-04'), sess('2026-11-18')], 3, today)
  expect(bars.map((b) => b.days)).toEqual([1, 0, 1])
})
test('sem treino concluído: sem barras', () => {
  expect(weeklyBars([], 3, today)).toEqual({ bars: [], avgDays: 0 })
})
test('média conta a semana atual proporcional aos dias passados', () => {
  // semanas fechadas: 3 e 3; semana atual (seg→qui = 4/7): 2
  const ss = ['2026-11-03', '2026-11-05', '2026-11-07', '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-17', '2026-11-19'].map((d) => sess(d))
  expect(weeklyBars(ss, 3, today).avgDays).toBeCloseTo(8 / (2 + 4 / 7))
})
test('sequência: semana atual abaixo da meta não quebra', () => {
  const ss = ['2026-11-03', '2026-11-05', '2026-11-07', '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-17'].map((d) => sess(d))
  expect(goalStreak(ss, 3, today)).toEqual({ current: 2, bestBefore: 0 })
})
test('sequência: semana atual que já bateu soma', () => {
  const ss = ['2026-11-10', '2026-11-12', '2026-11-14', '2026-11-16', '2026-11-17', '2026-11-18'].map((d) => sess(d))
  expect(goalStreak(ss, 3, today).current).toBe(2)
})
test('sequência: primeira semana parcial não quebra', () => {
  const ss = ['2026-11-08', '2026-11-10', '2026-11-12', '2026-11-14'].map((d) => sess(d)) // 08 = domingo, semana de 02/11 com 1 dia
  expect(goalStreak(ss, 3, today).current).toBe(1)
})
test('sequência: bestBefore é a maior sequência anterior à atual', () => {
  expect(goalStreak(streakLog([3, 3, 3, 0, 3, 3]), 3, '2026-11-23')).toEqual({ current: 2, bestBefore: 3 })
})
test('média não infla quando o primeiro treino é desta semana', () => {
  // um treino na segunda, visto na quinta: 1 dia na semana, não 1,75
  expect(weeklyBars([sess('2026-11-16')], 3, today).avgDays).toBe(1)
})
