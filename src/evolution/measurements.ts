import type { Profile } from '@/profile/types'
import type { MeasureFields, Measurement } from './types'
import { bodyFat, type Metric } from './bodyFat'

export type Point = { date: string; value: number }
type Key = keyof MeasureFields
/** `digits` = casas no PDF; `spaced: false` cola a unidade no número ("22,9%"); `deltaUnit` = unidade da diferença quando não é a do valor */
export interface Field { key: Metric; label: string; unit: string; digits: number; spaced?: false; deltaUnit?: string }

export const WEIGHT = { key: 'weightKg', label: 'Peso', unit: 'kg', digits: 1 } satisfies Field & { key: Key }
export const FIELDS: (Field & { key: Key })[] = [
  WEIGHT,
  { key: 'neckCm', label: 'Pescoço', unit: 'cm', digits: 0 },
  { key: 'waistCm', label: 'Cintura', unit: 'cm', digits: 0 },
  { key: 'hipCm', label: 'Quadril', unit: 'cm', digits: 0 },
  { key: 'armCm', label: 'Braço', unit: 'cm', digits: 0 },
  { key: 'chestCm', label: 'Peito', unit: 'cm', digits: 0 },
  { key: 'thighCm', label: 'Coxa', unit: 'cm', digits: 0 },
]
export const FAT = { key: 'fat', label: 'Gordura', unit: '%', digits: 1, spaced: false, deltaUnit: 'pt' } satisfies Field

export const byDate = <T extends { date: string }>(l: T[]) => [...l].sort((a, b) => a.date.localeCompare(b.date))

export function upsertMeasurement(list: Measurement[], date: string, fields: { [K in Key]?: number | null }): { list: Measurement[]; status: 'same' | 'saved' | 'removed' } {
  const cur = list.find((m) => m.date === date)
  const next: Measurement = { ...(cur ?? { id: crypto.randomUUID(), date }) }
  for (const { key } of FIELDS) {
    const v = fields[key]
    if (v === null) delete next[key]
    else if (v !== undefined) next[key] = v
  }
  if (FIELDS.every(({ key }) => next[key] === cur?.[key])) return { list, status: 'same' }
  const kept = FIELDS.some(({ key }) => next[key] !== undefined)
  return { list: byDate(kept ? [...removeMeasurement(list, date), next] : removeMeasurement(list, date)), status: kept ? 'saved' : 'removed' }
}

export const removeMeasurement = (list: Measurement[], date: string) => list.filter((m) => m.date !== date)

export const series = (ms: Measurement[], key: Key): Point[] => byDate(ms).flatMap((m) => (m[key] === undefined ? [] : [{ date: m.date, value: m[key] }]))

/** % de gordura de cada registro que tem o que a fórmula pede (nunca pescoço de um dia com cintura de outro) */
export const fatSeries = (p: Profile, ms: Measurement[]): Point[] =>
  byDate(ms).flatMap((m) => { const value = bodyFat(p.sex, p.heightCm, m); return value === null ? [] : [{ date: m.date, value }] })

export const latestWeight = (ms: Measurement[]): number | undefined => series(ms, 'weightKg').at(-1)?.value

export const pointAt = (points: Point[], date: string) => (points.filter((p) => p.date <= date).pop() ?? points[0])?.value
