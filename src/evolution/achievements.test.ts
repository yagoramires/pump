import { dietDay, pe } from '../../test/helpers'
import type { DietLog } from '../types'
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
test('progresso da sequência parte da sequência atual, não da melhor', () => {
  const days = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-22'] // 5 seguidos, faltou sáb 21, voltou dom 22
  const log = Object.fromEntries(days.map((k) => [k, done(k)]))
  const a = computeAchievements({ workoutLog: log, workoutPlan: plan([0, 1, 2, 3, 4, 5, 6]), measurements: [], photoSets: [] }, '2026-11-22')
  expect(get(a, 'streak-7').progress).toBe('falta 6')
})

const base = { workoutLog: {}, workoutPlan: plan([]), measurements: [], photoSets: [] }
const menu = { menus: [{ id: 'm', name: 'Padrão', meals: [] }] }
const fullDays = (keys: string[]): DietLog => Object.fromEntries(keys.map((k) => [k, dietDay([true, true])]))
const nov = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-11-${from + i}`)

test('as 3 de dieta só entram com cardápio ou dia de dieta', () => {
  expect(computeAchievements(base, '2026-11-20')).toHaveLength(12)
  expect(computeAchievements({ ...base, dietPlan: menu }, '2026-11-20').map((a) => a.id).slice(12)).toEqual(['diet-day', 'diet-7', 'water-7'])
  expect(computeAchievements({ ...base, dietLog: fullDays(['2026-11-19']) }, '2026-11-20')).toHaveLength(15)
})
test('dia no plano só conta dia fechado; hoje 100% não ganha', () => {
  const today = computeAchievements({ ...base, dietLog: fullDays(['2026-11-20']) }, '2026-11-20')
  expect(get(today, 'diet-day').earnedAt).toBeUndefined()
  const log = { '2026-11-18': dietDay([true, false]), '2026-11-19': dietDay([true, true]), '2026-11-20': dietDay([true, true]) }
  expect(get(computeAchievements({ ...base, dietLog: log }, '2026-11-20'), 'diet-day')).toMatchObject({ title: 'Dia no plano', earnedAt: '2026-11-19' })
  // extra estraga o 100%
  const extra = dietDay([true, true])
  extra.meals[0].items.push({ ...extra.meals[0].items[0], id: 'x', extra: true })
  expect(get(computeAchievements({ ...base, dietLog: { '2026-11-19': extra } }, '2026-11-20'), 'diet-day').earnedAt).toBeUndefined()
})
test('7 dias na dieta quebra com dia sem registro', () => {
  const seven = computeAchievements({ ...base, dietLog: fullDays(nov(10, 16)) }, '2026-11-20')
  expect(get(seven, 'diet-7')).toMatchObject({ title: '7 dias na dieta', earnedAt: '2026-11-16' })
  // falta o dia 13: 3 + 4
  const gap = computeAchievements({ ...base, dietLog: fullDays([...nov(10, 12), ...nov(14, 17)]) }, '2026-11-18')
  expect(get(gap, 'diet-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 3' })
  // hoje não conta: 6 fechados + hoje
  expect(get(computeAchievements({ ...base, dietLog: fullDays(nov(10, 16)) }, '2026-11-16'), 'diet-7').progress).toBe('falta 1')
})
test('dia livre da semana é pulado na sequência; o 2º livre da semana quebra', () => {
  // 2026-11-15 é domingo; livre na quarta 18 não conta nem quebra
  const ok = { ...fullDays([...nov(16, 17), ...nov(19, 23)]), '2026-11-18': dietDay([false, false], { free: true }) }
  expect(get(computeAchievements({ ...base, dietLog: ok }, '2026-11-24'), 'diet-7').earnedAt).toBe('2026-11-23')
  // 18 livre (neutro), 19 livre de novo (desvio, quebra), depois 6 dias 100%
  const twice = { ...fullDays([...nov(16, 17), ...nov(20, 25)]), '2026-11-18': dietDay([false, false], { free: true }), '2026-11-19': dietDay([false, false], { free: true }) }
  expect(get(computeAchievements({ ...base, dietLog: twice }, '2026-11-26'), 'diet-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 1' })
})
test('água 7 dias lê o waterLog mesmo com a água desligada', () => {
  // não há configuração de água no Input: só o que foi registrado em cada dia
  const water = Object.fromEntries(nov(10, 16).map((k) => [k, { ml: 2500, goalMl: 2500 }]))
  expect(get(computeAchievements({ ...base, dietPlan: menu, waterLog: water }, '2026-11-20'), 'water-7')).toMatchObject({ title: 'Água 7 dias', earnedAt: '2026-11-16' })
  const short = { ...water, '2026-11-13': { ml: 2000, goalMl: 2500 } }
  expect(get(computeAchievements({ ...base, dietPlan: menu, waterLog: short }, '2026-11-20'), 'water-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 7' })
})
test('1º descanso da semana não quebra a sequência; o 2º quebra', () => {
  // plano todo dia; semana de dom 15 a sáb 21
  const rest = (date: string) => ({ date, workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true })
  const every = plan([0, 1, 2, 3, 4, 5, 6])
  const one = { '2026-11-16': done('2026-11-16'), '2026-11-17': rest('2026-11-17'), '2026-11-18': done('2026-11-18'), '2026-11-19': done('2026-11-19') }
  const a = computeAchievements({ workoutLog: one, workoutPlan: every, measurements: [], photoSets: [] }, '2026-11-20')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-19')
  expect(get(a, 'workouts-10').progress).toBe('falta 7') // descanso não é treino
  const two = { ...one, '2026-11-18': rest('2026-11-18'), '2026-11-19': done('2026-11-19'), '2026-11-20': done('2026-11-20') }
  const b = computeAchievements({ workoutLog: two, workoutPlan: every, measurements: [], photoSets: [] }, '2026-11-21')
  expect(get(b, 'streak-3').earnedAt).toBeUndefined()
  expect(get(b, 'streak-7').progress).toBe('falta 5')
  // semana nova (dom 22) zera a cota: 19, 20, 21, (22 descanso), 23 = 4
  const three = { ...two, '2026-11-21': done('2026-11-21'), '2026-11-22': rest('2026-11-22'), '2026-11-23': done('2026-11-23') }
  expect(get(computeAchievements({ workoutLog: three, workoutPlan: every, measurements: [], photoSets: [] }, '2026-11-24'), 'streak-7').progress).toBe('falta 3')
})
