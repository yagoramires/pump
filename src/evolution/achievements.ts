import type { Measurement, PhotoSet, Profile, WorkoutLog, WorkoutPlan } from '../types'
import { daysBetween, parseDayKey, todayKey, weekday } from '../lib/date'
import { formatKg } from '../lib/number'
import { bodyFat, goalDirection } from './bodyFat'

export type AchievementId = 'first-workout' | 'streak-3' | 'streak-7' | 'streak-30' | 'workouts-10' | 'workouts-50' | 'workouts-100' | 'record' | 'first-photo' | 'weight-small' | 'weight-big' | 'fat-1'
export interface Achievement { id: AchievementId; title: string; earnedAt?: string; progress?: string }
interface Input { workoutLog: WorkoutLog; workoutPlan: WorkoutPlan; measurements: Measurement[]; photoSets: PhotoSet[]; profile?: Profile }

const EPS = 1e-9
const byDate = <T extends { date: string }>(l: T[]) => [...l].sort((a, b) => a.date.localeCompare(b.date))

export function computeAchievements(d: Input, today: string): Achievement[] {
  const sessions = byDate(Object.values(d.workoutLog).filter((s) => s.completedAt))
  const total = (n: number): Achievement['earnedAt'] => sessions[n - 1]?.date

  // sequência: dia previsto no plano atual, sem treino e antes de hoje, zera
  const trained = new Set(sessions.map((s) => s.date))
  const planned = new Set(d.workoutPlan.workouts.flatMap((w) => w.weekdays))
  const reached = new Map<number, string>()
  let count = 0
  let best = 0
  if (sessions.length) {
    const start = sessions[0].date
    for (let i = 0, n = daysBetween(start, today); i <= n; i++) {
      const dt = parseDayKey(start)
      dt.setDate(dt.getDate() + i)
      const key = todayKey(dt)
      if (trained.has(key)) {
        count++
        best = Math.max(best, count)
        if (!reached.has(count)) reached.set(count, key)
      } else if (key < today && planned.has(weekday(key))) count = 0
    }
  }
  const streakAt = (n: number) => [...reached].find(([c]) => c >= n)?.[1]

  // recorde: carga acima do máximo anterior de um exercício que já existia
  const max = new Map<string, number>()
  let record: string | undefined
  for (const s of sessions) {
    const today_ = new Map<string, number>()
    for (const e of s.exercises) {
      const kg = Math.max(0, ...e.sets.map((x) => x?.weightKg ?? 0))
      today_.set(e.exerciseId, Math.max(kg, today_.get(e.exerciseId) ?? 0))
    }
    for (const [id, kg] of today_) {
      const prev = max.get(id)
      if (prev !== undefined && kg > prev && !record) record = s.date
      max.set(id, Math.max(kg, prev ?? 0))
    }
  }

  const ms = byDate(d.measurements)
  const dir = goalDirection(d.profile)
  const sign = dir === 'loss' ? 1 : -1
  const weights = ms.filter((m) => m.weightKg !== undefined)
  const w0 = weights[0]?.weightKg
  // quanto já mudou na direção do objetivo
  const wDelta = (w: number) => (w0 === undefined ? 0 : (w0 - w) * sign)
  const weightAt = (n: number) => weights.find((m) => wDelta(m.weightKg!) >= n - EPS)?.date
  const wBest = Math.max(0, ...weights.map((m) => wDelta(m.weightKg!)))
  const left = (n: number) => `falta ${formatKg(Math.max(0, n - wBest))} kg`

  const p = d.profile
  const fats = p ? ms.flatMap((m) => { const f = bodyFat(p.sex, p.heightCm, m); return f === null ? [] : [{ date: m.date, f }] }) : []
  const fatAt = fats.length ? fats.find((x) => fats[0].f - x.f >= 1 - EPS)?.date : undefined

  const left_ = (n: number, have: number) => `falta ${n - have}`
  const mk = (id: AchievementId, title: string, earnedAt?: string, progress?: string): Achievement => ({ id, title, earnedAt, progress: earnedAt ? undefined : progress })
  const [s, b] = dir === 'loss' ? ['−1 kg', '−5 kg'] : ['+1 kg', '+3 kg']
  const [ns, nb] = dir === 'loss' ? [1, 5] : [1, 3]
  return [
    mk('first-workout', 'Primeiro treino', total(1)),
    mk('streak-3', '3 treinos seguidos', streakAt(3), left_(3, best)),
    mk('streak-7', '7 treinos seguidos', streakAt(7), left_(7, best)),
    mk('streak-30', '30 treinos seguidos', streakAt(30), left_(30, best)),
    mk('workouts-10', '10 treinos', total(10), left_(10, sessions.length)),
    mk('workouts-50', '50 treinos', total(50), left_(50, sessions.length)),
    mk('workouts-100', '100 treinos', total(100), left_(100, sessions.length)),
    mk('record', 'Recorde de carga', record),
    mk('first-photo', 'Primeira foto', byDate(d.photoSets.filter((x) => x.frente || x.lado || x.costas))[0]?.date),
    mk('weight-small', s, weightAt(ns), left(ns)),
    mk('weight-big', b, weightAt(nb), left(nb)),
    mk('fat-1', '−1 ponto de gordura', fatAt),
  ]
}
