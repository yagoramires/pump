import type { Angle, Measurement, PhotoSet, Profile, WorkoutLog, WorkoutPlan } from '../types'
import { daysBetween } from '../lib/date'
import { sessionStats } from '../workout/stats'
import { computeAchievements } from './achievements'
import { bodyFat, goalDirection, isGood, type Metric } from './bodyFat'
import { FIELDS, firstLast } from './measurements'

type Pt = { date: string; value: number }
export interface Report {
  period: { start: string; end: string; days: number }
  summary: { weightDelta?: number; fatDelta?: number; workouts: number; volumeTons: number }
  photoPairs: { angle: Angle; before: { date: string; id: string }; after: { date: string; id: string } }[]
  body: { weight: Pt[]; rows: { label: string; unit: string; first: number; last: number; delta: number; good: boolean }[] } | null
  training: { workouts: number; perWeek: number; topLifts: { name: string; first: number; max: number }[]; achievements: { title: string; earnedAt: string }[] }
}
interface Input { workoutLog: WorkoutLog; workoutPlan: WorkoutPlan; measurements: Measurement[]; photoSets: PhotoSet[]; profile?: Profile }

const r1 = (n: number) => Math.round(n * 10) / 10
const byDate = <T extends { date: string }>(l: T[]) => [...l].sort((a, b) => a.date.localeCompare(b.date))
// diferença só entre dois registros de dias diferentes
const diff = ({ first, last }: { first?: Pt; last?: Pt }) => (first && last && first.date !== last.date ? r1(last.value - first.value) : undefined)

export function buildReport(d: Input, today: string): Report {
  const sessions = byDate(Object.values(d.workoutLog).filter((s) => s.completedAt))
  const ms = byDate(d.measurements)
  const sets = byDate(d.photoSets)
  const start = [sessions[0]?.date, ms[0]?.date, sets[0]?.date].filter((x): x is string => !!x).sort()[0] ?? today
  const dir = goalDirection(d.profile)

  const p = d.profile
  const fats = p ? ms.flatMap((m) => { const value = bodyFat(p.sex, p.heightCm, m); return value === null ? [] : [{ date: m.date, value }] }) : []
  const fat = { first: fats[0], last: fats[fats.length - 1] }
  const weight = firstLast(ms, 'weightKg')

  const row = (label: string, unit: string, metric: Metric, { first, last }: { first?: Pt; last?: Pt }) => {
    if (!first || !last) return []
    const delta = r1(last.value - first.value)
    return [{ label, unit, first: first.value, last: last.value, delta, good: delta !== 0 && isGood(metric, dir, delta) }]
  }
  const body = ms.length
    ? {
        weight: ms.filter((m) => m.weightKg !== undefined).map((m) => ({ date: m.date, value: m.weightKg! })),
        rows: [
          ...row('Peso', 'kg', 'weightKg', weight),
          ...row('Gordura', '%', 'fat', fat),
          ...FIELDS.filter((f) => f.key !== 'weightKg').flatMap((f) => row(f.label, f.unit, f.key, firstLast(ms, f.key))),
        ],
      }
    : null

  const [before, after] = [sets[0], sets[sets.length - 1]]
  const photoPairs = before && after && before !== after
    ? (['frente', 'lado', 'costas'] as const).flatMap((angle) => {
        const b = before[angle]
        const a = after[angle]
        return b && a ? [{ angle, before: { date: before.date, id: b }, after: { date: after.date, id: a } }] : []
      })
    : []

  // carga da primeira sessão de cada exercício contra a maior depois
  const lifts = new Map<string, { name: string; first: number; max: number }>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      const kg = Math.max(0, ...e.sets.map((x) => x?.weightKg ?? 0))
      const cur = lifts.get(e.exerciseId)
      if (cur) cur.max = Math.max(cur.max, kg)
      else lifts.set(e.exerciseId, { name: e.name, first: kg, max: kg })
    }
  }
  const topLifts = [...lifts.values()].filter((l) => l.max > l.first).sort((a, b) => b.max - b.first - (a.max - a.first)).slice(0, 5)

  const now = new Date()
  const volume = sessions.reduce((a, s) => a + sessionStats(s, now).volumeKg, 0)
  const weeks = sessions.length ? Math.max(1, (daysBetween(sessions[0].date, today) + 1) / 7) : 1
  const achievements = computeAchievements(d, today).flatMap((a) => (a.earnedAt ? [{ title: a.title, earnedAt: a.earnedAt }] : []))

  return {
    period: { start, end: today, days: daysBetween(start, today) + 1 },
    summary: { weightDelta: diff(weight), fatDelta: diff(fat), workouts: sessions.length, volumeTons: r1(volume / 1000) },
    photoPairs,
    body,
    training: { workouts: sessions.length, perWeek: r1(sessions.length / weeks), topLifts, achievements },
  }
}
