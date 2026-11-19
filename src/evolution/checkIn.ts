import type { Settings } from '@/schema'
import type { Profile } from '@/profile/types'
import type { Measurement, PhotoSet } from './types'
import { addDays, daysBetween, weekStart, weeksBetween } from '@/lib/date'
import { BODY_FIELDS, WEIGHT, deltaUnit, metricRow, metricSeries, series } from './measurements'
import { goalDirection } from './bodyFat'
import { ANGLES } from './types'

export function checkInDue(settings: Settings, measurements: Measurement[], today: string): string | undefined {
  const day = settings.checkInDay
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
  const dir = goalDirection(profile)
  const first = weights[0]
  const prev = weights.filter((w) => w.date < today).pop()
  const previousWeight = prev && metricRow(WEIGHT, dir, prev, now)
  const rows = BODY_FIELDS.filter((field) => field.key !== WEIGHT.key).flatMap((field) => {
    const points = metricSeries(profile, measurements, field)
    const before = points.filter((p) => p.date < today).pop()
    const current = points.find((p) => p.date === today)
    if (!before || !current) return []
    const { label, delta, good } = metricRow(field, dir, before, current)
    return delta ? [{ label, unit: deltaUnit(field), delta, good }] : []
  })
  const photos = photoSets.find((set) => set.date === today)
  return {
    week: weeksBetween(first.date, today),
    weight: now.value,
    sincePrev: previousWeight?.delta,
    weightGood: previousWeight?.good ?? false,
    prevDate: prev?.date,
    prevIsLastWeek: !!prev && daysBetween(prev.date, today) <= LAST_WEEK_MAX_DAYS,
    sinceStart: metricRow(WEIGHT, dir, first, now).delta,
    rows,
    photos: ANGLES.filter((angle) => photos?.[angle]).length,
  }
}
