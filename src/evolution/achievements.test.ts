import { pe } from '../../test/helpers'
import { computeAchievements, type Achievement, type AchievementId } from './achievements'

const done = (date: string, sets: { id: string; kg: number }[] = []) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T19:00:00.000Z`, exercises: sets.map((s) => ({ ...pe({ exerciseId: s.id, name: s.id }), sets: [{ reps: '10', weightKg: s.kg }] })) })
const plan = (weekdays: number[]) => ({ workouts: [{ id: 'a', label: 'A', name: 'A', weekdays, exercises: [] }] })
const get = (list: Achievement[], id: AchievementId) => list.find((a) => a.id === id)!

test('sequência: folga não quebra, falta em dia previsto quebra', () => {
  // plano seg/qua/sex; 2026-11-16 é segunda
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-18': done('2026-11-18'), '2026-11-20': done('2026-11-20') }
  const a = computeAchievements({ workoutLog: log, workoutPlan: plan([1, 3, 5]), measurements: [], photoSets: [] }, '2026-11-22')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-20')
  const log2 = { '2026-11-16': done('2026-11-16'), '2026-11-20': done('2026-11-20'), '2026-11-23': done('2026-11-23') } // faltou qua 18
  expect(get(computeAchievements({ workoutLog: log2, workoutPlan: plan([1, 3, 5]), measurements: [], photoSets: [] }, '2026-11-24'), 'streak-3').earnedAt).toBeUndefined()
})
test('sem plano: conta só os dias treinados, sem travar', () => {
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-19': done('2026-11-19') }
  const a = computeAchievements({ workoutLog: log, workoutPlan: { workouts: [] }, measurements: [], photoSets: [] }, '2026-11-20')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-19')
  expect(get(a, 'first-workout').earnedAt).toBe('2026-11-16')
  expect(get(a, 'workouts-10').progress).toBe('falta 7')
})
test('recorde só depois de já existir o exercício', () => {
  const log = { '2026-11-16': done('2026-11-16', [{ id: 'Supino', kg: 40 }]), '2026-11-18': done('2026-11-18', [{ id: 'Supino', kg: 40 }]), '2026-11-20': done('2026-11-20', [{ id: 'Supino', kg: 42.5 }]) }
  expect(get(computeAchievements({ workoutLog: log, workoutPlan: plan([]), measurements: [], photoSets: [] }, '2026-11-21'), 'record').earnedAt).toBe('2026-11-20')
})
test('peso: direção pelo objetivo', () => {
  const ms = [{ id: '1', date: '2026-11-01', weightKg: 80 }, { id: '2', date: '2026-11-15', weightKg: 78.8 }]
  const loss = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [] }, '2026-11-16')
  expect(get(loss, 'weight-small')).toMatchObject({ title: '−1 kg', earnedAt: '2026-11-15' })
  expect(get(loss, 'weight-big').progress).toBe('falta 3,8 kg')
  const gain = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [], profile: { sex: 'M', heightCm: 178, weightKg: 80, anamnesis: { goal: 'hipertrofia' } } }, '2026-11-16')
  expect(get(gain, 'weight-small')).toMatchObject({ title: '+1 kg', earnedAt: undefined })
})
test('primeira foto e gordura −1 ponto', () => {
  const ms = [{ id: '1', date: '2026-11-01', neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-11-20', neckCm: 38, waistCm: 85 }]
  const a = computeAchievements({ workoutLog: {}, workoutPlan: plan([]), measurements: ms, photoSets: [{ id: 's', date: '2026-11-03', frente: 'p' }], profile: { sex: 'M', heightCm: 178, weightKg: 80 } }, '2026-11-21')
  expect(get(a, 'first-photo').earnedAt).toBe('2026-11-03')
  expect(get(a, 'fat-1').earnedAt).toBe('2026-11-20')
})
