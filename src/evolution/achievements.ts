import type { EvolutionInput } from './types'
import { addDays, eachDay, weekday } from '@/lib/date'
import { formatKg } from '@/lib/number'
import { dayStatus } from '@/diet/day'
import { completedSessions, maxLoad } from '@/workout/stats'
import { neutralRest } from '@/workout/rest'
import { waterMet } from '@/diet/water'
import { goalDirection } from './bodyFat'
import { byDate, fatSeries, series } from './measurements'
import { hasDiet } from './dietStats'
import { hasPhoto } from './photoSets'

export type AchievementId = 'first-workout' | 'streak-3' | 'streak-7' | 'streak-30' | 'workouts-10' | 'workouts-50' | 'workouts-100' | 'record' | 'first-photo' | 'weight-small' | 'weight-big' | 'fat-1' | 'diet-day' | 'diet-7' | 'water-7'
/** `diet`: só aparece (e só conta no "de N") com cardápio ou dia de dieta (§167) */
export interface Achievement { id: AchievementId; title: string; earnedAt?: string; progress?: string; diet?: true }

// kg na direção do objetivo: [limite, título] da pequena e da grande
const WEIGHT_BADGES = { loss: [[1, '−1 kg'], [5, '−5 kg']], gain: [[1, '+1 kg'], [3, '+3 kg']] } as const

const EPS = 1e-9

// dias seguidos de `from` até ontem (dia aberto não conta): true soma, null pula, false zera
function dayRun(from: string | undefined, today: string, ok: (k: string) => boolean | null) {
  let n = 0, first: string | undefined, seven: string | undefined
  for (const k of from ? eachDay(from, today) : []) {
    const r = ok(k)
    if (r) {
      first ??= k
      if (++n >= 7) seven ??= k
    } else if (r === false) n = 0
  }
  return { n, first, seven }
}

export function computeAchievements(d: EvolutionInput, today: string): Achievement[] {
  const sessions = completedSessions(d.workoutLog)
  const total = (n: number): Achievement['earnedAt'] => sessions[n - 1]?.date

  // sequência: dia previsto no plano atual, sem treino e antes de hoje, zera; o 1º descanso marcado da semana não conta como previsto
  const trained = new Set(sessions.map((s) => s.date))
  const planned = new Set(d.workoutPlan.workouts.flatMap((w) => w.weekdays))
  const reached = new Map<number, string>()
  let count = 0
  if (sessions.length) {
    for (const key of eachDay(sessions[0].date, addDays(today, 1))) {
      if (trained.has(key)) {
        count++
        if (!reached.has(count)) reached.set(count, key)
      } else if (key < today && planned.has(weekday(key)) && !neutralRest(d.workoutLog, key)) count = 0
    }
  }
  const streakAt = (n: number) => [...reached].find(([c]) => c >= n)?.[1]

  // recorde: carga acima do máximo anterior de um exercício que já existia
  const max = new Map<string, number>()
  let record: string | undefined
  for (const s of sessions) {
    const sessionMax = new Map<string, number>()
    for (const e of s.exercises) {
      const kg = maxLoad(e)
      sessionMax.set(e.exerciseId, Math.max(kg, sessionMax.get(e.exerciseId) ?? 0))
    }
    for (const [id, kg] of sessionMax) {
      const prev = max.get(id)
      if (prev !== undefined && kg > prev && !record) record = s.date
      max.set(id, Math.max(kg, prev ?? 0))
    }
  }

  const dir = goalDirection(d.profile)
  const sign = dir === 'loss' ? 1 : -1
  const weights = series(d.measurements, 'weightKg')
  const w0 = weights[0]?.value
  // quanto já mudou na direção do objetivo
  const wDelta = (w: number) => (w0 === undefined ? 0 : (w0 - w) * sign)
  const weightAt = (n: number) => weights.find((m) => wDelta(m.value) >= n - EPS)?.date
  const wBest = Math.max(0, ...weights.map((m) => wDelta(m.value)))
  const leftKg = (n: number) => `falta ${formatKg(Math.max(0, n - wBest))} kg`

  const fats = fatSeries(d.profile, d.measurements)
  const fatAt = fats.find((x) => fats[0].value - x.value >= 1 - EPS)?.date

  // dieta: dia livre neutro da semana ('free-ok') é pulado; dia sem registro quebra
  const dl = d.dietLog
  const wl = d.waterLog
  const diet = dayRun(Object.keys(dl).sort()[0], today, (k) => { const st = dayStatus(dl, k); return st === 'full' ? true : st === 'free-ok' ? null : false })
  const water = dayRun(Object.keys(wl).sort()[0], today, (k) => waterMet(wl[k]))

  const left = (n: number, have: number) => `falta ${n - have}`
  const mk = (id: AchievementId, title: string, earnedAt?: string, progress?: string): Achievement => ({ id, title, earnedAt, progress: earnedAt ? undefined : progress })
  const [[ns, s], [nb, b]] = WEIGHT_BADGES[dir]
  const list: Achievement[] = [
    mk('first-workout', 'Primeiro treino', total(1)),
    mk('streak-3', '3 treinos seguidos', streakAt(3), left(3, count)),
    mk('streak-7', '7 treinos seguidos', streakAt(7), left(7, count)),
    mk('streak-30', '30 treinos seguidos', streakAt(30), left(30, count)),
    mk('workouts-10', '10 treinos', total(10), left(10, sessions.length)),
    mk('workouts-50', '50 treinos', total(50), left(50, sessions.length)),
    mk('workouts-100', '100 treinos', total(100), left(100, sessions.length)),
    mk('record', 'Recorde de carga', record),
    mk('first-photo', 'Primeira foto', byDate(d.photoSets.filter(hasPhoto))[0]?.date),
    mk('weight-small', s, weightAt(ns), leftKg(ns)),
    mk('weight-big', b, weightAt(nb), leftKg(nb)),
    mk('fat-1', '−1 ponto de gordura', fatAt),
    { ...mk('diet-day', 'Dia no plano', diet.first), diet: true },
    { ...mk('diet-7', '7 dias na dieta', diet.seven, left(7, diet.n)), diet: true },
    { ...mk('water-7', 'Água 7 dias', water.seven, left(7, water.n)), diet: true },
  ]
  return hasDiet(d.dietPlan, d.dietLog) ? list : list.filter((a) => !a.diet)
}
