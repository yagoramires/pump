import { highlights } from './highlights'
import { evolutionInput, pe } from '../../test/helpers'
import { DEFAULTS } from '@/schema'
import { addDays, mondayWeekStart } from '@/lib/date'
import type { SessionExercise, SetDone, WorkoutSession } from '../workout/types'
import type { Measurement } from './types'

const today = '2026-11-19'
const set = (weightKg: number, reps = '10'): SetDone => ({ weightKg, reps })
const supino = (sets: (SetDone | null)[], over: Partial<SessionExercise> = {}): Partial<SessionExercise> =>
  ({ exerciseId: 'Supino', name: 'Supino', muscles: ['peito'], sets, ...over })
const sess = (date: string, exs: Partial<SessionExercise>[] = [supino([set(60)])]): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T20:00:00.000Z`,
  exercises: exs.map((e) => ({ ...pe(), sets: [], ...e }) as SessionExercise),
})
const streakLog = (perWeek: number[], ref = '2026-11-23') => {
  const first = addDays(mondayWeekStart(ref), -7 * perWeek.length)
  return perWeek.flatMap((n, w) => Array.from({ length: n }, (_, d) => sess(addDays(first, w * 7 + d))))
}
const m = (date: string, kg: number): Measurement => ({ id: date, date, weightKg: kg })
const goal = (dietGoal: 'perder' | 'manter' | 'ganhar') => ({ ...DEFAULTS.profile, dietGoal })

test('recorde de carga: título, ganho desde a primeira carga e quando', () => {
  const d = evolutionInput({ sessions: [sess('2026-08-12', [supino([set(72.5)])]), sess('2026-11-01', [supino([set(75)])]), sess('2026-11-18', [supino([set(80)])])] })
  expect(highlights(d, today)[0]).toEqual({ kind: 'record', title: 'Recorde no Supino: 80 kg', detail: '+7,5 kg desde 12 ago · ontem' })
})
test('recorde de reps', () => {
  const d = evolutionInput({ sessions: [sess('2026-11-01', [supino([set(60, '8')])]), sess('2026-11-19', [supino([set(60, '10')])])] })
  expect(highlights(d, today)[0]).toMatchObject({ title: 'Recorde no Supino: 10 reps com 60 kg', detail: '+2 reps · antes 8 · hoje' })
})
test('recorde: no empate de data, vence a maior carga', () => {
  const rosca = (sets: SetDone[]) => supino(sets, { exerciseId: 'Rosca', name: 'Rosca', muscles: ['bíceps'] })
  const d = evolutionInput({ sessions: [sess('2026-11-01', [supino([set(70)]), rosca([set(15)])]), sess('2026-11-18', [rosca([set(20)]), supino([set(80)])])] })
  expect(highlights(d, today)[0].title).toBe('Recorde no Supino: 80 kg')
})
test('recorde fora dos 30 dias não aparece', () => {
  const d = evolutionInput({ sessions: [sess('2026-09-01', [supino([set(70)])]), sess('2026-10-01', [supino([set(80)])])] })
  expect(highlights(d, today)).toEqual([])
})
test('peso caindo com objetivo perder, 14+ dias: título, janela e ritmo', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-10-18', 80), m('2026-11-15', 78)] })
  expect(highlights(d, today)).toEqual([{ kind: 'weight', title: 'Peso caiu 2 kg', detail: 'em 28 dias · 0,5 kg/semana', trend: 'down' }])
})
test('peso subindo com objetivo ganhar', () => {
  const d = evolutionInput({ profile: goal('ganhar'), measurements: [m('2026-10-18', 70), m('2026-11-15', 71)] })
  expect(highlights(d, today)[0]).toMatchObject({ title: 'Peso subiu 1 kg', trend: 'up' })
})
test('gordura entra no detalhe quando também caiu', () => {
  const profile = { ...goal('perder'), sex: 'M' as const, heightCm: 178 }
  const d = evolutionInput({ profile, measurements: [{ ...m('2026-10-18', 80), neckCm: 38, waistCm: 90 }, { ...m('2026-11-15', 78), neckCm: 38, waistCm: 86 }] })
  expect(highlights(d, today)[0].detail).toMatch(/^em 28 dias · 0,5 kg\/semana · gordura −[\d,]+ pt$/)
})
test('pesagens a menos de 14 dias não viram destaque', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-11-12', 80), m('2026-11-15', 79.2)] })
  expect(highlights(d, today)).toEqual([])
})
test('mudança menor que 0,5 kg não vira destaque', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-10-18', 80), m('2026-11-15', 79.7)] })
  expect(highlights(d, today)).toEqual([])
})
test('peso contra o objetivo não aparece', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-10-18', 78), m('2026-11-15', 80)] })
  expect(highlights(d, today)).toEqual([])
})
test('última pesagem com mais de 30 dias não vira destaque', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-08-01', 82), m('2026-10-01', 80)] })
  expect(highlights(d, today)).toEqual([])
})
test('base é a pesagem real até hoje−30, com a data dela', () => {
  const d = evolutionInput({ profile: goal('perder'), measurements: [m('2026-09-01', 84), m('2026-10-10', 82), m('2026-11-17', 80)] })
  expect(highlights(d, today)[0].detail).toMatch(/^em 38 dias/)
})
test('manter: peso estável com 3+ semanas e variação abaixo de 1 kg', () => {
  const d = evolutionInput({ profile: goal('manter'), measurements: [m('2026-10-20', 80), m('2026-11-17', 80.4)] })
  expect(highlights(d, today)[0]).toEqual({ kind: 'weight', title: 'Peso estável', detail: '±0,4 kg em 28 dias', trend: 'flat' })
})
test('manter: pesagens a menos de 3 semanas não viram destaque', () => {
  const d = evolutionInput({ profile: goal('manter'), measurements: [m('2026-11-05', 80), m('2026-11-17', 80.4)] })
  expect(highlights(d, today)).toEqual([])
})
test('sem objetivo: nada de peso', () => {
  const d = evolutionInput({ measurements: [m('2026-10-18', 80), m('2026-11-15', 78)] })
  expect(highlights(d, today)).toEqual([])
})
test('sequência: maior até agora e igual ao recorde', () => {
  const profile = { ...DEFAULTS.profile, daysPerWeek: 3 }
  expect(highlights(evolutionInput({ profile, sessions: streakLog([3, 3, 0, 3, 3, 3]) }), '2026-11-23').at(-1))
    .toEqual({ kind: 'streak', title: '3 semanas seguidas batendo a meta', detail: 'sua maior sequência até agora' })
  expect(highlights(evolutionInput({ profile, sessions: streakLog([3, 3, 0, 3, 3]) }), '2026-11-23').at(-1)?.detail).toBe('igual ao seu recorde')
})
test('sequência: abaixo do recorde mostra o recorde', () => {
  const profile = { ...DEFAULTS.profile, daysPerWeek: 3 }
  expect(highlights(evolutionInput({ profile, sessions: streakLog([3, 3, 3, 0, 3, 3]) }), '2026-11-23').at(-1)?.detail).toBe('recorde: 3 semanas')
})
test('no máximo 3 e nesta ordem: recorde, peso, sequência', () => {
  const d = evolutionInput({
    profile: { ...goal('perder'), daysPerWeek: 3 },
    sessions: [...streakLog([3, 3, 3]), sess('2026-11-20', [supino([set(80)])])],
    measurements: [m('2026-10-20', 80), m('2026-11-20', 78)],
  })
  expect(highlights(d, '2026-11-23').map((h) => h.kind)).toEqual(['record', 'weight', 'streak'])
})
test('sem nada: lista vazia', () => {
  expect(highlights(evolutionInput(), today)).toEqual([])
})
