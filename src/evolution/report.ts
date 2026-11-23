import type { Angle, EvolutionInput, PhotoSet } from './types'
import { daysBetween } from '@/lib/date'
import { round1 } from '@/lib/number'
import { completedSessions, exerciseHistory, loadPoints, sessionVolume } from '@/workout/stats'
import { computeAchievements, type Achievement } from './achievements'
import { BODY_FIELDS, WEIGHT, bodyRows, byDate, fatSeries, series, type BodyRow, type Point } from './measurements'
import { dietStats, firstDietDate, hasDiet, type DietStats } from './dietStats'
import { ANGLES } from './types'

type Earned = { title: string; earnedAt: string }
export interface Report {
  period: { start: string; end: string; days: number }
  achievements: Achievement[]
  hasDiet: boolean
  lastSet?: PhotoSet
  photoPairs: { angle: Angle; before: { date: string; id: string }; after: { date: string; id: string } }[]
  body: { weight: Point[]; fat: Point[]; rows: BodyRow[] } | null
  training: { workouts: number; perWeek: number; volumeTons: number; topLifts: { name: string; first: number; max: number }[]; achievements: Earned[] }
  diet: (DietStats & { achievements: Earned[] }) | null
}

export function buildReport(d: EvolutionInput, today: string): Report {
  const sessions = completedSessions(d.sessions)
  const ms = byDate(d.measurements)
  const sets = byDate(d.photoSets)
  const start = [sessions[0]?.date, ms[0]?.date, sets[0]?.date, firstDietDate(d.dietLog, d.waterLog)].filter((x): x is string => !!x).sort()[0] ?? today

  const body = ms.length ? { weight: series(ms, WEIGHT.key), fat: fatSeries(d.profile, ms), rows: bodyRows(d.profile, ms, BODY_FIELDS, (points) => [points[0], points.at(-1)]) } : null

  const [before, after] = [sets[0], sets[sets.length - 1]]
  const photoPairs = before && after && before !== after
    ? ANGLES.flatMap((angle) => {
        const b = before[angle]
        const a = after[angle]
        return b && a ? [{ angle, before: { date: before.date, id: b }, after: { date: after.date, id: a } }] : []
      })
    : []

  const topLifts = [...exerciseHistory(sessions).values()].flatMap((entries) => {
    const loads = loadPoints(entries)
    const first = loads[0]?.value
    const max = Math.max(...loads.map((p) => p.value))
    return max > first ? [{ name: entries[entries.length - 1].e.name, first, max }] : []
  }).sort((a, b) => b.max - b.first - (a.max - a.first)).slice(0, 5)

  const volume = sessions.reduce((a, s) => a + sessionVolume(s), 0)
  const weeks = sessions.length ? Math.max(1, (daysBetween(sessions[0].date, today) + 1) / 7) : 1
  const achievements = computeAchievements(d, today)
  const earned = (diet: boolean) => achievements.flatMap((a) => (a.earnedAt && !!a.diet === diet ? [{ title: a.title, earnedAt: a.earnedAt }] : []))

  return {
    period: { start, end: today, days: daysBetween(start, today) + 1 },
    achievements,
    hasDiet: hasDiet(d.dietPlan, d.dietLog),
    lastSet: sets[sets.length - 1],
    photoPairs,
    body,
    training: { workouts: sessions.length, perWeek: round1(sessions.length / weeks), volumeTons: round1(volume / 1000), topLifts, achievements: earned(false) },
    diet: Object.keys(d.dietLog).length ? { ...dietStats(d.dietLog, d.waterLog, start, today), achievements: earned(true) } : null,
  }
}
