import { dietDay, evolutionInput, pe } from '../../test/helpers'
import type { DietLog } from '@/diet/types'
import { computeAchievements, type Achievement, type AchievementId } from './achievements'
import { restRecord } from '@/workout/rest'
import { trainingLog } from '@/workout/extra'

const done = (date: string, sets: { id: string; kg: number }[] = []) => ({ date, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', completedAt: `${date}T19:00:00.000Z`, exercises: sets.map((s) => ({ ...pe({ exerciseId: s.id, name: s.id }), sets: [{ reps: '10', weightKg: s.kg }] })) })
const plan = (n: number) => ({ workouts: Array.from({ length: n }, (_, i) => ({ id: `w${i}`, label: 'A', name: 'A', exercises: [] })) })
const goalInput = (log: object, daysPerWeek?: number, workouts = 1) => evolutionInput({ workoutLog: log as never, workoutPlan: plan(workouts), measurements: [], photoSets: [], profile: { sex: 'M', heightCm: 178, daysPerWeek } })
// 1ª sessão numa semana anterior: a semana da 1ª sessão é parcial e nunca zera, então ela vem antes (a semana 8-14 fica vazia e zera)
const first = { '2026-11-01': done('2026-11-01') }
const get = (list: Achievement[], id: AchievementId) => list.find((a) => a.id === id)!

test('sequência: semana fechada abaixo da meta zera; na meta mantém', () => {
  // semana dom 15 a sáb 21, meta 3: 2 treinos zeram no sábado
  const below = { ...first, '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-23': done('2026-11-23'), '2026-11-24': done('2026-11-24'), '2026-11-25': done('2026-11-25') }
  const a = computeAchievements(goalInput(below, 3), '2026-11-26')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-25')
  expect(get(a, 'streak-7').progress).toBe('falta 4')
  // meta 2: a mesma semana basta e a sequência segue
  const b = computeAchievements(goalInput({ ...first, '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-23': done('2026-11-23') }, 2), '2026-11-24')
  expect(get(b, 'streak-3').earnedAt).toBe('2026-11-23')
})
test('conquista já ganha não some quando a meta sobe', () => {
  const log = { ...first, '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-23': done('2026-11-23') }
  expect(get(computeAchievements(goalInput(log, 2), '2026-11-24'), 'streak-3').earnedAt).toBe('2026-11-23')
  expect(get(computeAchievements(goalInput(log, 3), '2026-11-24'), 'streak-3').earnedAt).toBeUndefined()
  const kept = get(computeAchievements({ ...goalInput(log, 3), earnedAchievements: { 'streak-3': '2026-11-23' } }, '2026-11-24'), 'streak-3')
  expect(kept).toMatchObject({ earnedAt: '2026-11-23', progress: undefined })
})
test('sequência: a semana da 1ª sessão é parcial e nunca zera', () => {
  // começa na quinta 19, meta 4, treina qui/sex/sáb: a sequência de 3 sobrevive ao sábado
  const log = { '2026-11-19': done('2026-11-19'), '2026-11-20': done('2026-11-20'), '2026-11-21': done('2026-11-21') }
  const a = computeAchievements(goalInput(log, 4), '2026-11-22')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-21')
  expect(get(a, 'streak-7').progress).toBe('falta 4')
})
test('sequência: semana atual com 0 treinos não zera', () => {
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-18': done('2026-11-18') }
  const a = computeAchievements(goalInput(log, 3), '2026-11-25') // quarta da semana seguinte, nada treinado ainda
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-18')
  expect(get(a, 'streak-7').progress).toBe('falta 4')
})
test('sequência: sem daysPerWeek a meta é o número de treinos do plano', () => {
  const log = { ...first, '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-23': done('2026-11-23') }
  expect(get(computeAchievements(goalInput(log, undefined, 2), '2026-11-24'), 'streak-3').earnedAt).toBe('2026-11-23')
  expect(get(computeAchievements(goalInput(log, undefined, 3), '2026-11-24'), 'streak-3').earnedAt).toBeUndefined()
})
test('sequência: descanso no meio não soma nem zera', () => {
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-17': restRecord('2026-11-17'), '2026-11-18': done('2026-11-18'), '2026-11-19': done('2026-11-19') }
  const a = computeAchievements(goalInput(log, 3), '2026-11-20')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-19')
  expect(get(a, 'workouts-10').progress).toBe('falta 7')
})
test('sem plano: conta só os dias treinados, sem travar', () => {
  const log = { '2026-11-16': done('2026-11-16'), '2026-11-17': done('2026-11-17'), '2026-11-19': done('2026-11-19') }
  const a = computeAchievements(evolutionInput({ workoutLog: log, workoutPlan: { workouts: [] }, measurements: [], photoSets: [] }), '2026-11-20')
  expect(get(a, 'streak-3').earnedAt).toBe('2026-11-19')
  expect(get(a, 'first-workout').earnedAt).toBe('2026-11-16')
  expect(get(a, 'workouts-10').progress).toBe('falta 7')
})
test('recorde só depois de já existir o exercício', () => {
  const log = { '2026-11-16': done('2026-11-16', [{ id: 'Supino', kg: 40 }]), '2026-11-18': done('2026-11-18', [{ id: 'Supino', kg: 40 }]), '2026-11-20': done('2026-11-20', [{ id: 'Supino', kg: 42.5 }]) }
  expect(get(computeAchievements(evolutionInput({ workoutLog: log, workoutPlan: plan(0), measurements: [], photoSets: [] }), '2026-11-21'), 'record').earnedAt).toBe('2026-11-20')
})
test('peso: direção pelo objetivo', () => {
  const ms = [{ id: '1', date: '2026-11-01', weightKg: 80 }, { id: '2', date: '2026-11-15', weightKg: 78.8 }]
  const loss = computeAchievements(evolutionInput({ workoutLog: {}, workoutPlan: plan(0), measurements: ms, photoSets: [] , profile: { sex: 'M', heightCm: 178, dietGoal: 'perder' } }), '2026-11-16')
  expect(get(loss, 'weight-small')).toMatchObject({ title: '−1 kg', earnedAt: '2026-11-15' })
  expect(get(loss, 'weight-big').progress).toBe('falta 3,8 kg')
  const gain = computeAchievements(evolutionInput({ workoutLog: {}, workoutPlan: plan(0), measurements: ms, photoSets: [], profile: { sex: 'M', heightCm: 178, dietGoal: 'ganhar' } }), '2026-11-16')
  expect(get(gain, 'weight-small')).toMatchObject({ title: '+1 kg', earnedAt: undefined })
})
test('primeira foto e gordura −1 ponto', () => {
  const ms = [{ id: '1', date: '2026-11-01', neckCm: 38, waistCm: 88 }, { id: '2', date: '2026-11-20', neckCm: 38, waistCm: 85 }]
  const a = computeAchievements(evolutionInput({ workoutLog: {}, workoutPlan: plan(0), measurements: ms, photoSets: [{ id: 's', date: '2026-11-03', frente: 'p' }], profile: { sex: 'M', heightCm: 178 } }), '2026-11-21')
  expect(get(a, 'first-photo').earnedAt).toBe('2026-11-03')
  expect(get(a, 'fat-1').earnedAt).toBe('2026-11-20')
})
test('progresso da sequência parte da sequência atual, não da melhor', () => {
  const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16'] // 5 na semana seg–dom (meta 7) zeram no dom 15; seg 16 recomeça
  const log = { ...first, ...Object.fromEntries(days.map((k) => [k, done(k)])) }
  expect(get(computeAchievements(goalInput(log, 7), '2026-11-16'), 'streak-7').progress).toBe('falta 6')
})

const base = evolutionInput({ workoutPlan: plan(0) })
const menu = { menus: [{ id: 'm', name: 'Padrão', meals: [] }] }
const fullDays = (keys: string[]): DietLog => Object.fromEntries(keys.map((k) => [k, dietDay([true, true])]))
const nov = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `2026-11-${from + i}`)

test('as 3 de dieta só entram com cardápio ou dia de dieta', () => {
  const DIET: AchievementId[] = ['diet-day', 'diet-7', 'water-7']
  const ids = (l: Achievement[]) => l.map((a) => a.id)
  expect(ids(computeAchievements(base, '2026-11-20')).filter((id) => DIET.includes(id))).toEqual([])
  expect(ids(computeAchievements(evolutionInput({ ...base, dietPlan: menu }), '2026-11-20')).slice(-3)).toEqual(DIET)
  expect(ids(computeAchievements(evolutionInput({ ...base, dietLog: fullDays(['2026-11-19']) }), '2026-11-20')).slice(-3)).toEqual(DIET)
})
test('dia no plano só conta dia fechado; hoje 100% não ganha', () => {
  const today = computeAchievements(evolutionInput({ ...base, dietLog: fullDays(['2026-11-20']) }), '2026-11-20')
  expect(get(today, 'diet-day').earnedAt).toBeUndefined()
  const log = { '2026-11-18': dietDay([true, false]), '2026-11-19': dietDay([true, true]), '2026-11-20': dietDay([true, true]) }
  expect(get(computeAchievements(evolutionInput({ ...base, dietLog: log }), '2026-11-20'), 'diet-day')).toMatchObject({ title: 'Dia no plano', earnedAt: '2026-11-19' })
  const extra = dietDay([true, true])
  extra.meals[0].items.push({ ...extra.meals[0].items[0], id: 'x', extra: true })
  expect(get(computeAchievements(evolutionInput({ ...base, dietLog: { '2026-11-19': extra } }), '2026-11-20'), 'diet-day').earnedAt).toBeUndefined()
})
test('7 dias na dieta quebra com dia sem registro', () => {
  const seven = computeAchievements(evolutionInput({ ...base, dietLog: fullDays(nov(10, 16)) }), '2026-11-20')
  expect(get(seven, 'diet-7')).toMatchObject({ title: '7 dias na dieta', earnedAt: '2026-11-16' })
  // falta o dia 13: 3 + 4
  const gap = computeAchievements(evolutionInput({ ...base, dietLog: fullDays([...nov(10, 12), ...nov(14, 17)]) }), '2026-11-18')
  expect(get(gap, 'diet-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 3' })
  // hoje não conta: 6 fechados + hoje
  expect(get(computeAchievements(evolutionInput({ ...base, dietLog: fullDays(nov(10, 16)) }), '2026-11-16'), 'diet-7').progress).toBe('falta 1')
})
test('dia livre da semana é pulado na sequência; o 2º livre da semana quebra', () => {
  // 2026-11-15 é domingo; livre na quarta 18 não conta nem quebra
  const ok = { ...fullDays([...nov(16, 17), ...nov(19, 23)]), '2026-11-18': dietDay([false, false], { free: true }) }
  expect(get(computeAchievements(evolutionInput({ ...base, dietLog: ok }), '2026-11-24'), 'diet-7').earnedAt).toBe('2026-11-23')
  // 18 livre (neutro), 19 livre de novo (desvio, quebra), depois 6 dias 100%
  const twice = { ...fullDays([...nov(16, 17), ...nov(20, 25)]), '2026-11-18': dietDay([false, false], { free: true }), '2026-11-19': dietDay([false, false], { free: true }) }
  expect(get(computeAchievements(evolutionInput({ ...base, dietLog: twice }), '2026-11-26'), 'diet-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 1' })
})
test('água 7 dias lê o waterLog mesmo com a água desligada', () => {
  const water = Object.fromEntries(nov(10, 16).map((k) => [k, { ml: 2500, goalMl: 2500 }]))
  expect(get(computeAchievements(evolutionInput({ ...base, dietPlan: menu, waterLog: water }), '2026-11-20'), 'water-7')).toMatchObject({ title: 'Água 7 dias', earnedAt: '2026-11-16' })
  const short = { ...water, '2026-11-13': { ml: 2000, goalMl: 2500 } }
  expect(get(computeAchievements(evolutionInput({ ...base, dietPlan: menu, waterLog: short }), '2026-11-20'), 'water-7')).toMatchObject({ earnedAt: undefined, progress: 'falta 7' })
})
test('sem objetivo de peso, conquistas de peso somem da lista', () => {
  const ids = computeAchievements(evolutionInput({ profile: { sex: 'M', heightCm: 178 }, measurements: [], photoSets: [] }), '2026-11-20').map((a) => a.id)
  expect(ids).not.toContain('weight-small')
  expect(ids).not.toContain('weight-big')
  expect(ids).toContain('fat-1')
})
const extra = (date: string) => ({ ...done(date), workoutId: 'extra', workoutLabel: 'Extra', workoutName: 'Treino extra' })
test('treino extra conta como dia treinado na sequência', () => {
  const log = trainingLog({ '2026-11-16': done('2026-11-16'), '2026-11-18': done('2026-11-18') }, { '2026-11-17': extra('2026-11-17') })
  expect(get(computeAchievements(goalInput(log, 3), '2026-11-19'), 'streak-3').earnedAt).toBe('2026-11-18')
})
test('extra no mesmo dia da ficha conta uma vez na sequência e duas nos totais', () => {
  const days = Array.from({ length: 9 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`)
  const log = trainingLog(Object.fromEntries(days.map((d) => [d, done(d)])), { '2026-11-09': extra('2026-11-09') })
  expect(get(computeAchievements(goalInput(log, 7), '2026-11-10'), 'workouts-10').earnedAt).toBe('2026-11-09')
})
