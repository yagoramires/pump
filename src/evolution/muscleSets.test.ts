import { muscleSummary } from './muscleSets'
import { pe } from '../../test/helpers'
import type { SessionExercise, SetDone, WorkoutSession } from '../workout/types'

const today = '2026-11-19'
const set = (weightKg: number, reps = '10'): SetDone => ({ weightKg, reps })
const sess = (date: string, exs: Partial<SessionExercise>[]): WorkoutSession => ({
  date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T20:00:00.000Z`,
  exercises: exs.map((e) => ({ ...pe(), sets: [], ...e }) as SessionExercise),
})
const supino = (sets: (SetDone | null)[], over: Partial<SessionExercise> = {}): Partial<SessionExercise> =>
  ({ exerciseId: 'Supino', name: 'Supino', muscles: ['peito'], primary: ['peito'], sets, ...over })
const agacho = (sets: (SetDone | null)[]): Partial<SessionExercise> =>
  ({ exerciseId: 'Agacho', name: 'Agachamento', muscles: ['quadríceps'], primary: ['quadríceps'], sets })
const corrida = (sets: (SetDone | null)[]): Partial<SessionExercise> =>
  ({ exerciseId: 'Corrida', name: 'Corrida', muscles: ['quadríceps', 'panturrilhas'], reps: '20 min', sets })

test('sem sessão nos 30 dias: null', () => {
  expect(muscleSummary([sess('2026-10-01', [supino([set(60)])])], today)).toBeNull()
})
test('só cardio nos 30 dias: null', () => {
  expect(muscleSummary([sess('2026-11-18', [corrida([set(0, '20 min')])])], today)).toBeNull()
})
test('exercício sem série marcada e cardio ficam fora', () => {
  const s = muscleSummary([sess('2026-11-18', [supino([null]), corrida([set(0, '20 min')]), agacho([set(80)])])], today)!
  expect([...s.levels.keys()]).toEqual(['quadríceps'])
  expect(s.groups.find((g) => g.label === 'Peito')!.status).toBe('idle')
})
test('ombro só como auxiliar no supino não fica parado', () => {
  const s = muscleSummary([sess('2026-11-18', [supino([set(60)], { muscles: ['peito', 'ombros', 'tríceps'], primary: ['peito'] })])], today)!
  expect(s.groups.find((g) => g.label === 'Ombros')!.status).toBe('auxiliary')
})
test('séries por semana dividem pelos dias reais de histórico', () => {
  // primeiro treino há 7 dias (8 dias de histórico); 8 séries de peito → 8 / (8/7) = 7
  const s = muscleSummary([sess('2026-11-12', [supino(Array(4).fill(set(60)))]), sess('2026-11-19', [supino(Array(4).fill(set(60)))])], today)!
  expect(s.groups[0]).toMatchObject({ label: 'Peito', perWeek: 7, status: 'trained' })
})
test('plano antigo sem primary usa o primeiro músculo como principal', () => {
  const s = muscleSummary([sess('2026-11-18', [supino([set(60)], { muscles: ['peito', 'tríceps'], primary: undefined })])], today)!
  expect(s.levels.get('peito')).toBe('primary')
  expect(s.levels.get('tríceps')).toBe('secondary')
})
test('grupo com pouca série arredonda pra no mínimo 1 por semana', () => {
  const s = muscleSummary([sess('2026-10-21', [agacho([set(80)])]), sess('2026-11-18', [supino([set(60)])])], today)!
  expect(s.groups.find((g) => g.label === 'Peito')!.perWeek).toBe(1) // 1 série em 30 dias = 0,23
})
test('ordem: treinados por séries, depois auxiliares, depois parados; sem Outros', () => {
  const s = muscleSummary([sess('2026-11-18', [agacho([set(80), set(80)]), supino([set(60)], { muscles: ['peito', 'ombros'], primary: ['peito'] })])], today)!
  expect(s.groups.map((g) => g.label)).toEqual(['Pernas', 'Peito', 'Ombros', 'Costas', 'Braços', 'Abdômen'])
})
test('primeira semana: divide por pelo menos uma semana', () => {
  const s = muscleSummary([sess('2026-11-19', [supino(Array(12).fill(set(60)))])], today)!
  expect(s.groups[0]).toMatchObject({ label: 'Peito', perWeek: 12 })
})
