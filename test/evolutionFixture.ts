import type { DietLog, DietPlan, WaterLog } from '../src/diet/types'
import type { Measurement, PhotoSet } from '../src/evolution/types'
import type { Profile } from '../src/profile/types'
import type { WorkoutLog, WorkoutPlan, WorkoutSession } from '../src/workout/types'
import { addDays, eachDay, weekday } from '../src/lib/date'
import { restRecord } from '../src/workout/rest'
import { dietDay, pe } from './helpers'

/** uns 2,5 meses de tudo (treino, medidas, fotos, dieta, água): golden das conquistas/relatório e amostra do PDF */
const lift = (name: string, kg: number, sets = 3) => ({ ...pe({ exerciseId: name, name }), sets: Array.from({ length: sets }, () => ({ reps: '10', weightKg: kg })) })

const workoutLog: WorkoutLog = {}
let week = 0
for (const k of eachDay('2026-10-05', '2026-12-19')) {
  if (![1, 3, 5].includes(weekday(k))) continue
  if (k === '2026-11-11') continue // faltou numa quarta prevista
  if (k === '2026-11-13') { workoutLog[k] = restRecord(k); continue } // 1º descanso da semana: neutro
  if (weekday(k) === 1) week++
  const s: WorkoutSession = {
    date: k, workoutId: 'a', workoutLabel: 'A', workoutName: 'Treino A', startedAt: `${k}T18:00:00.000Z`, completedAt: `${k}T19:05:00.000Z`,
    exercises: [lift('Supino reto', 40 + Math.floor(week / 2) * 2.5), lift('Agachamento', 60 + week * 2.5), lift('Remada − curvada', 35), lift('Rosca', 12 + (week > 6 ? 2 : 0))],
  }
  workoutLog[k] = s
}
delete workoutLog['2026-12-18'].completedAt // aberto e não concluído: não conta

const workoutPlan: WorkoutPlan = { workouts: [{ id: 'a', label: 'A', name: 'Treino A', weekdays: [1, 3, 5], exercises: [] }] }

const measurements: Measurement[] = [
  { id: 'm1', date: '2026-10-05', weightKg: 88, neckCm: 40, waistCm: 98, hipCm: 104, armCm: 36, chestCm: 104 },
  { id: 'm2', date: '2026-10-26', weightKg: 86.9, waistCm: 96 },
  { id: 'm3', date: '2026-11-16', weightKg: 85.2, neckCm: 39.5, waistCm: 94, hipCm: 102, armCm: 36.5 },
  { id: 'm4', date: '2026-12-14', weightKg: 83.7, neckCm: 39.5, waistCm: 92.5, hipCm: 101, chestCm: 102, thighCm: 58 },
]

const photoSets: PhotoSet[] = [
  { id: 's1', date: '2026-10-05', frente: 'p1', lado: 'p2', costas: 'p3' },
  { id: 's2', date: '2026-11-16', frente: 'p4' },
  { id: 's3', date: '2026-12-14', frente: 'p5', costas: 'p6' },
]

const dietPlan: DietPlan = { menus: [{ id: 'm', name: 'Padrão', goalKcal: 2000, meals: [] }], lastMenuId: 'm' }

const dietLog: DietLog = {}
for (const k of eachDay('2026-11-20', '2026-12-19')) {
  if (k === '2026-12-08') continue // dia sem registro: quebra a sequência
  dietLog[k] = dietDay([true, true, true], { goalKcal: k < '2026-12-01' ? 2000 : 1800 })
}
dietLog['2026-11-25'] = dietDay([false, false, false], { free: true }) // livre da semana
dietLog['2026-11-26'] = dietDay([true, true, true], { free: true }) // 2º livre da semana
const extra = dietDay([true, true, true])
extra.meals[1].items.push({ ...extra.meals[1].items[0], id: 'x', extra: true })
dietLog['2026-12-02'] = extra
dietLog['2026-12-05'] = dietDay([true, false, true])
const freeMeal = dietDay([true, false, true])
freeMeal.meals[1].free = true
dietLog['2026-12-06'] = freeMeal
dietLog['2026-12-17'] = dietDay([false, false, false]) // cópia sem marca antiga (W4: ainda conta como dia)

const waterLog: WaterLog = {}
for (const k of eachDay('2026-11-28', '2026-12-19')) waterLog[k] = { ml: k === '2026-12-03' ? 1500 : 2750, goalMl: 2500 }

const profile: Profile = { sex: 'M', heightCm: 178, dietGoal: 'perder' }

export const RICH = { workoutLog, workoutPlan, measurements, photoSets, profile, dietLog, waterLog, dietPlan }
const RICH_TODAY = '2026-12-20'
export const RICH_TODAYS = ['2026-10-20', '2026-11-30', RICH_TODAY, addDays(RICH_TODAY, 40)]

export const PROFILES: Record<string, Profile> = {
  loss: profile,
  gain: { sex: 'M', heightCm: 178, dietGoal: 'ganhar' },
  female: { sex: 'F', heightCm: 165, dietGoal: 'ganhar' },
  neutral: { sex: 'M', heightCm: 178 },
  noHeight: { sex: 'M', heightCm: 0, dietGoal: 'perder' },
}
