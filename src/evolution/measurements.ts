import type { Profile, Sex } from '@/profile/types'
import type { MeasureFields, Measurement } from './types'
import { round1 } from '@/lib/number'
import { bodyFat, usesHip } from './bodyFat'
import { goalDirection, isGood, type GoalDirection, type Metric } from './goal'

export type Point = { date: string; value: number }
type Key = keyof MeasureFields
/** `digits`: casas decimais no máximo (padrão 2); `pdfDigits`: casas sempre mostradas no PDF (padrão 0) */
export interface Field { key: Metric; label: string; unit: string; digits?: number; pdfDigits?: number; deltaUnit?: string }
export interface BodyRow extends Field { first: Point; last: Point; delta?: number; good: boolean }

export const WEIGHT = { key: 'weightKg', label: 'Peso', unit: 'kg', pdfDigits: 1 } satisfies Field & { key: Key }
export const WAIST = { key: 'waistCm', label: 'Cintura', unit: 'cm' } satisfies Field & { key: Key }
const CM_FIELDS: (Field & { key: Key })[] = [
  { key: 'neckCm', label: 'Pescoço', unit: 'cm' },
  WAIST,
  { key: 'hipCm', label: 'Quadril', unit: 'cm' },
  { key: 'armCm', label: 'Braço', unit: 'cm' },
  { key: 'chestCm', label: 'Peito', unit: 'cm' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm' },
]
export const FIELDS = [WEIGHT, ...CM_FIELDS]
/** os campos que o formulário pede pra esse sexo */
export const fieldsFor = (sex: Sex) => FIELDS.filter((f) => f.key !== 'hipCm' || usesHip(sex))
export const FAT = { key: 'fat', label: 'Gordura', unit: '%', digits: 1, pdfDigits: 1, deltaUnit: 'pt' } satisfies Field

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

export const previousMeasure = (ms: Measurement[], key: Key, date: string) =>
  series(ms, key).findLast((point) => point.date < date)

/** % de gordura de cada registro que tem o que a fórmula pede (nunca pescoço de um dia com cintura de outro) */
export const fatSeries = (p: Profile, ms: Measurement[]): Point[] =>
  byDate(ms).flatMap((m) => { const value = bodyFat(p.sex, p.heightCm, m); return value === null ? [] : [{ date: m.date, value }] })

export const latestWeight = (ms: Measurement[]): number | undefined => series(ms, WEIGHT.key).at(-1)?.value

export const pointAt = (points: Point[], date: string): Point | undefined => {
  const p = points.findLast((x) => x.date <= date)
  return p && { date, value: p.value }
}

const metricSeries = (p: Profile, ms: Measurement[], { key }: Field): Point[] =>
  key === FAT.key ? fatSeries(p, ms) : series(ms, key)

function metricRow(field: Field, direction: GoalDirection, first: Point, last: Point): BodyRow {
  const delta = first.date !== last.date ? round1(last.value - first.value) : undefined
  return { ...field, first, last, delta, good: delta !== undefined && isGood(field.key, direction, delta) }
}

/** uma linha por campo que tem as duas pontas; `ends` escolhe as pontas na série do campo */
export function bodyRows(p: Profile, ms: Measurement[], fields: Field[], ends: (points: Point[]) => [Point?, Point?]): BodyRow[] {
  const dir = goalDirection(p)
  return fields.flatMap((field) => {
    const [first, last] = ends(metricSeries(p, ms, field))
    return first && last ? [metricRow(field, dir, first, last)] : []
  })
}

export const deltaUnit = (field: Field) => field.deltaUnit ?? field.unit

export const formatMetric = (field: Field, value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: field.digits ?? 2 })

/** espaço inquebrável: o número não quebra de linha longe da unidade */
export const metricUnit = (field: Field) => (field.unit === '%' ? field.unit : `\u00a0${field.unit}`)

export const formatValue = (field: Field, value: number) => `${formatMetric(field, value)}${metricUnit(field)}`
