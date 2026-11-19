import type { Profile } from '@/profile/types'
import type { MeasureFields, Measurement } from './types'
import { formatDec, formatKg, round1 } from '@/lib/number'
import { bodyFat, isGood, type GoalDirection, type Metric } from './bodyFat'

export type Point = { date: string; value: number }
type Key = keyof MeasureFields
export interface Field { key: Metric; label: string; unit: string; pdfDigits: number; spaced?: false; deltaUnit?: string }
export interface BodyRow extends Field { first: Point; last: Point; delta?: number; good: boolean }

export const WEIGHT = { key: 'weightKg', label: 'Peso', unit: 'kg', pdfDigits: 1 } satisfies Field & { key: Key }
export const WAIST = { key: 'waistCm', label: 'Cintura', unit: 'cm', pdfDigits: 0 } satisfies Field & { key: Key }
const CM_FIELDS: (Field & { key: Key })[] = [
  { key: 'neckCm', label: 'Pescoço', unit: 'cm', pdfDigits: 0 },
  WAIST,
  { key: 'hipCm', label: 'Quadril', unit: 'cm', pdfDigits: 0 },
  { key: 'armCm', label: 'Braço', unit: 'cm', pdfDigits: 0 },
  { key: 'chestCm', label: 'Peito', unit: 'cm', pdfDigits: 0 },
  { key: 'thighCm', label: 'Coxa', unit: 'cm', pdfDigits: 0 },
]
export const FIELDS = [WEIGHT, ...CM_FIELDS]
export const FAT = { key: 'fat', label: 'Gordura', unit: '%', pdfDigits: 1, spaced: false, deltaUnit: 'pt' } satisfies Field

export const BODY_FIELDS: Field[] = [WEIGHT, FAT, ...CM_FIELDS]

export const byDate = <T extends { date: string }>(l: T[]) => [...l].sort((a, b) => a.date.localeCompare(b.date))

export type UpsertStatus = 'same' | 'saved' | 'removed'
export function upsertMeasurement(list: Measurement[], date: string, fields: { [K in Key]?: number | null }): { list: Measurement[]; status: UpsertStatus } {
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

export const latestWeight = (ms: Measurement[]): number | undefined => series(ms, WEIGHT.key).at(-1)?.value

export const pointAt = (points: Point[], date: string) => (points.filter((p) => p.date <= date).pop() ?? points[0])?.value

export const metricSeries = (p: Profile, ms: Measurement[], { key }: Field): Point[] =>
  key === FAT.key ? fatSeries(p, ms) : series(ms, key)

export function metricRow(field: Field, direction: GoalDirection, first: Point, last: Point): BodyRow {
  const delta = first.date !== last.date ? round1(last.value - first.value) : undefined
  return { ...field, first, last, delta, good: delta !== undefined && isGood(field.key, direction, delta) }
}

export const deltaUnit = (field: Field) => field.deltaUnit ?? field.unit

export const formatMetric = (field: Field, value: number) => (field.key === FAT.key ? formatDec(value) : formatKg(value))

export const metricUnit = (field: Field) => field.spaced === false ? field.unit : ` ${field.unit}`
