import { dietDay, pe } from '../../test/helpers'
import { buildReport } from './report'

const session = (date: string, kg: number) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: 'x', exercises: [{ ...pe({ exerciseId: 'Supino', name: 'Supino reto' }), sets: [{ reps: '10', weightKg: kg }] }] })

test('buildReport: período, resumo, pares de fotos e corpo', () => {
  const r = buildReport({
    workoutLog: { '2026-11-16': session('2026-11-16', 40), '2026-12-01': session('2026-12-01', 50) },
    workoutPlan: { workouts: [] },
    measurements: [{ id: '1', date: '2026-11-15', weightKg: 80, neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-12-10', weightKg: 78.4, neckCm: 38, waistCm: 85 }],
    photoSets: [{ id: 'a', date: '2026-11-15', frente: 'p1', lado: 'p2' }, { id: 'b', date: '2026-12-10', frente: 'p3' }],
    profile: { sex: 'M', heightCm: 178, weightKg: 78.4 },
  }, '2026-12-12')
  expect(r.period).toEqual({ start: '2026-11-15', end: '2026-12-12', days: 28 })
  expect(r.summary).toMatchObject({ weightDelta: -1.6, workouts: 2, volumeTons: 0.9 })
  expect(r.photoPairs).toEqual([{ angle: 'frente', before: { date: '2026-11-15', id: 'p1' }, after: { date: '2026-12-10', id: 'p3' } }])
  expect(r.training.topLifts[0]).toEqual({ name: 'Supino reto', first: 40, max: 50 })
  expect(r.body?.rows.find((x) => x.label === 'Peso')).toMatchObject({ first: 80, last: 78.4, delta: -1.6, good: true })
  expect(r.body?.rows.find((x) => x.label === 'Gordura')).toMatchObject({ unit: '%', good: true })
  expect(r.summary.fatDelta).toBeLessThan(0)
})

test('buildReport sem altura: sem linha de gordura e sem fatDelta', () => {
  const r = buildReport({
    workoutLog: {},
    workoutPlan: { workouts: [] },
    measurements: [{ id: '1', date: '2026-11-15', weightKg: 80, neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-12-10', weightKg: 78.4, neckCm: 38, waistCm: 85 }],
    photoSets: [],
    profile: { sex: 'M', heightCm: 0, weightKg: 78.4 },
  }, '2026-12-12')
  expect(r.summary.fatDelta).toBeUndefined()
  expect(r.body?.rows.map((x) => x.label)).toEqual(['Peso', 'Pescoço', 'Cintura'])
})

test('buildReport sem medidas: body null; sem fotos: photoPairs []', () => {
  const r = buildReport({ workoutLog: { '2026-11-16': session('2026-11-16', 40) }, workoutPlan: { workouts: [] }, measurements: [], photoSets: [] }, '2026-11-16')
  expect(r.body).toBeNull()
  expect(r.photoPairs).toEqual([])
  expect(r.period).toEqual({ start: '2026-11-16', end: '2026-11-16', days: 1 })
  expect(r.summary).toEqual({ weight: undefined, weightDelta: undefined, fat: undefined, fatDelta: undefined, workouts: 1, volumeTons: 0.4 })
  expect(r.training.achievements.map((a) => a.title)).toContain('Primeiro treino')
  expect(r.diet).toBeNull()
})

test('report.diet: média, dias no plano e período começando no 1º dia de dieta', () => {
  const r = buildReport({
    // descanso marcado não conta como treino
    workoutLog: { '2026-12-02': { date: '2026-12-02', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [], rest: true } },
    workoutPlan: { workouts: [] },
    measurements: [{ id: '1', date: '2026-12-05', weightKg: 80 }],
    photoSets: [],
    dietLog: {
      '2026-12-01': dietDay([true, true]), // 400 kcal, meta 2000, 100%
      '2026-12-02': dietDay([true, false], { goalKcal: 1800 }), // 200 kcal
      '2026-12-03': dietDay([true, true], { free: true }), // livre: fora da média
      '2026-12-04': dietDay([false, false]), // nada marcado: fora da média
    },
    waterLog: { '2026-11-30': { ml: 2500, goalMl: 2000 }, '2026-12-01': { ml: 1000, goalMl: 2000 } },
  }, '2026-12-12')
  expect(r.period).toEqual({ start: '2026-11-30', end: '2026-12-12', days: 13 })
  expect(r.summary.workouts).toBe(0)
  expect(r.diet).toEqual({ avgKcal: 300, avgGoal: 1900, fullDays: 1, waterDays: 1, freeUses: 1, days: 13, achievements: [{ title: 'Dia no plano', earnedAt: '2026-12-01' }] })
  expect(r.training.achievements.map((a) => a.title)).not.toContain('Dia no plano')
})
