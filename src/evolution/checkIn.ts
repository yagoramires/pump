import type { Profile } from '@/profile/types'
import type { Measurement, PhotoSet } from './types'
import { addDays, daysBetween, weekStart, weeksBetween } from '@/lib/date'
import { BODY_FIELDS, WEIGHT, bodyRows, deltaUnit, series } from './measurements'
import { ANGLES } from './types'

export function checkInDue(day: number | undefined, measurements: Measurement[], today: string): string | undefined {
  const weights = series(measurements, WEIGHT.key)
  if (day === undefined || !weights.length) return undefined
  let d = addDays(weekStart(today), day)
  if (d > today) d = addDays(d, -7)
  return weights.some((w) => w.date >= d) ? undefined : d
}

const LAST_WEEK_MAX_DAYS = 8

interface WeekSummary {
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
  const weights = series(measurements, WEIGHT.key)
  const now = weights.find((w) => w.date === today)
  if (!now) return undefined
  const first = weights[0]
  const prev = weights.filter((w) => w.date < today).pop()
  const sinceLast = bodyRows(profile, measurements, BODY_FIELDS, (points) => [points.filter((p) => p.date < today).pop(), points.find((p) => p.date === today)])
  const previousWeight = sinceLast.find((r) => r.key === WEIGHT.key)
  const rows = sinceLast.flatMap((r) => (r.key !== WEIGHT.key && r.delta ? [{ label: r.label, unit: deltaUnit(r), delta: r.delta, good: r.good }] : []))
  const photos = photoSets.find((set) => set.date === today)
  return {
    week: weeksBetween(first.date, today),
    weight: now.value,
    sincePrev: previousWeight?.delta,
    weightGood: previousWeight?.good ?? false,
    prevDate: prev?.date,
    prevIsLastWeek: !!prev && daysBetween(prev.date, today) <= LAST_WEEK_MAX_DAYS,
    sinceStart: bodyRows(profile, measurements, [WEIGHT], () => [first, now])[0].delta,
    rows,
    photos: ANGLES.filter((angle) => photos?.[angle]).length,
  }
}
