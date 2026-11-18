import type { Settings } from '@/schema'
import type { Profile } from '@/profile/types'
import type { Measurement, PhotoSet } from './types'
import { round1 } from '@/lib/number'
import { addDays, daysBetween, weekStart, weekday, weeksBetween } from '@/lib/date'
import { FAT, FIELDS, WEIGHT, fatSeries, series, type Point } from './measurements'
import { goalDirection, isGood, type Metric } from './bodyFat'
import { ANGLES } from './types'

/** dia da semana do check-in: o escolhido ou o de hoje */
export const checkInDayOf = (settings: Settings, today: string): number => settings.checkInDay ?? weekday(today)

/** data do check-in pendente (dia da semana escolhido, na semana atual ou na passada), se ainda não pesou desde então */
export function checkInDue(settings: Settings, measurements: Measurement[], today: string): string | undefined {
  const day = settings.checkInDay
  const weights = series(measurements, 'weightKg')
  if (day === undefined || !weights.length) return undefined
  let d = addDays(weekStart(today), day)
  if (d > today) d = addDays(d, -7)
  return weights.some((w) => w.date >= d) ? undefined : d
}

/** até quantos dias a medição anterior ainda é "a semana passada" */
export const LAST_WEEK_MAX_DAYS = 8

export interface WeekSummary {
  week: number
  weight: number
  sincePrev?: number
  weightGood: boolean
  prevDate?: string
  prevIsLastWeek: boolean
  sinceStart?: number
  rows: { label: string; unit: string; delta: number; good: boolean }[]
  photos: number
}

export function weekSummary(profile: Profile, measurements: Measurement[], photoSets: PhotoSet[], today: string): WeekSummary | undefined {
  const weights = series(measurements, 'weightKg')
  const now = weights.find((w) => w.date === today)
  if (!now) return undefined
  const dir = goalDirection(profile)
  const first = weights[0]
  const prev = weights.filter((w) => w.date < today).pop()
  // delta de hoje contra o ponto anterior da mesma série
  const delta = (pts: Point[]) => {
    const cur = pts.find((p) => p.date === today)
    const before = pts.filter((p) => p.date < today).pop()
    return cur && before ? round1(cur.value - before.value) : undefined
  }
  const metrics: { key: Metric; label: string; unit: string; pts: Point[] }[] = [
    { key: 'fat', label: FAT.label, unit: FAT.deltaUnit, pts: fatSeries(profile, measurements) },
    ...FIELDS.filter((f) => f.key !== WEIGHT.key).map((f) => ({ key: f.key, label: f.label, unit: f.unit, pts: series(measurements, f.key) })),
  ]
  const rows = metrics.flatMap(({ key, label, unit, pts }) => {
    const d = delta(pts)
    return d ? [{ label, unit, delta: d, good: isGood(key, dir, d) }] : []
  })
  const sincePrev = delta(weights)
  return {
    week: weeksBetween(first.date, today),
    weight: now.value,
    sincePrev,
    weightGood: sincePrev !== undefined && isGood('weightKg', dir, sincePrev),
    prevDate: prev?.date,
    prevIsLastWeek: !!prev && daysBetween(prev.date, today) <= LAST_WEEK_MAX_DAYS,
    sinceStart: first.date === today ? undefined : round1(now.value - first.value),
    rows,
    photos: ANGLES.filter((a) => photoSets.find((p) => p.date === today)?.[a]).length,
  }
}
