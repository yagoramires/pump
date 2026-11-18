import type { Angle, EvolutionInput, PhotoSet } from './types'
import { daysBetween } from '@/lib/date'
import { round1 } from '@/lib/number'
import { completedSessions, maxLoad, sessionVolume } from '@/workout/stats'
import { computeAchievements, type Achievement } from './achievements'
import { goalDirection, isGood } from './bodyFat'
import { byDate, FAT, FIELDS, fatSeries, series, type Field, type Point } from './measurements'
import { dietStats, hasDiet, type DietStats } from './dietStats'
import { ANGLES } from './photoSets'

type Earned = { title: string; earnedAt: string }
export interface BodyRow extends Field { first: Point; last: Point; delta: number; good: boolean }
/** tudo que a aba, o PDF e a estante mostram, calculado uma vez */
export interface Report {
  period: { start: string; end: string; days: number }
  achievements: Achievement[]
  hasDiet: boolean
  lastSet?: PhotoSet
  photoPairs: { angle: Angle; before: { date: string; id: string }; after: { date: string; id: string } }[]
  /** rows: Peso, Gordura, depois as medidas em cm; só as que têm registro */
  body: { weight: Point[]; rows: BodyRow[] } | null
  training: { workouts: number; perWeek: number; volumeTons: number; topLifts: { name: string; first: number; max: number }[]; achievements: Earned[] }
  /** seção do PDF (§159): só com dias de dieta no período */
  diet: (DietStats & { achievements: Earned[] }) | null
}

/** diferença só entre dois registros de dias diferentes */
export const change = (r?: BodyRow) => (r && r.first.date !== r.last.date ? r.delta : undefined)

export function buildReport(d: EvolutionInput, today: string): Report {
  const sessions = completedSessions(d.workoutLog)
  const ms = byDate(d.measurements)
  const sets = byDate(d.photoSets)
  const dietDays = Object.keys(d.dietLog).sort()
  const start = [sessions[0]?.date, ms[0]?.date, sets[0]?.date, dietDays[0], Object.keys(d.waterLog).sort()[0]].filter((x): x is string => !!x).sort()[0] ?? today
  const dir = goalDirection(d.profile)

  const row = (f: Field, points: Point[]): BodyRow[] => {
    const [first, last] = [points[0], points[points.length - 1]]
    if (!first) return []
    const delta = round1(last.value - first.value)
    return [{ ...f, first, last, delta, good: isGood(f.key, dir, delta) }]
  }
  const weight = series(ms, 'weightKg')
  const [weightField, ...cmFields] = FIELDS
  const body = ms.length ? { weight, rows: [...row(weightField, weight), ...row(FAT, fatSeries(d.profile, ms)), ...cmFields.flatMap((f) => row(f, series(ms, f.key)))] } : null

  const [before, after] = [sets[0], sets[sets.length - 1]]
  const photoPairs = before && after && before !== after
    ? ANGLES.flatMap((angle) => {
        const b = before[angle]
        const a = after[angle]
        return b && a ? [{ angle, before: { date: before.date, id: b }, after: { date: after.date, id: a } }] : []
      })
    : []

  // carga da primeira sessão de cada exercício contra a maior depois
  const lifts = new Map<string, { name: string; first: number; max: number }>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      const kg = maxLoad(e)
      const cur = lifts.get(e.exerciseId)
      if (cur) cur.max = Math.max(cur.max, kg)
      else lifts.set(e.exerciseId, { name: e.name, first: kg, max: kg })
    }
  }
  const topLifts = [...lifts.values()].filter((l) => l.max > l.first).sort((a, b) => b.max - b.first - (a.max - a.first)).slice(0, 5)

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
    diet: dietDays.length ? { ...dietStats(d.dietLog, d.waterLog, start, today), achievements: earned(true) } : null,
  }
}
