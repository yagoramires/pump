import type { MeasureFields, Measurement } from '../types'

const KEYS = ['weightKg', 'neckCm', 'waistCm', 'hipCm', 'armCm', 'chestCm', 'thighCm'] as const
export const FIELDS: { key: keyof MeasureFields; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'neckCm', label: 'Pescoço', unit: 'cm' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'hipCm', label: 'Quadril', unit: 'cm' },
  { key: 'armCm', label: 'Braço', unit: 'cm' },
  { key: 'chestCm', label: 'Peito', unit: 'cm' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm' },
]

export function upsertMeasurement(list: Measurement[], date: string, fields: { [K in keyof MeasureFields]?: number | null }): Measurement[] {
  const cur = list.find((m) => m.date === date)
  const next: Measurement = { ...(cur ?? { id: crypto.randomUUID(), date }) }
  for (const k of KEYS) {
    const v = fields[k]
    if (v === null) delete next[k]
    else if (v !== undefined) next[k] = v
  }
  const rest = list.filter((m) => m.date !== date)
  const out = KEYS.some((k) => next[k] !== undefined) ? [...rest, next] : rest
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

type Point = { date: string; value: number }

export function firstLast(list: Measurement[], key: keyof MeasureFields): { first?: Point; last?: Point } {
  const pts = list.filter((m) => m[key] !== undefined).sort((a, b) => a.date.localeCompare(b.date))
  const pt = (m?: Measurement): Point | undefined => (m ? { date: m.date, value: m[key] as number } : undefined)
  return { first: pt(pts[0]), last: pt(pts[pts.length - 1]) }
}

/** valor da última medida em/antes de `date`; sem nenhuma antes, a mais próxima depois */
export function nearest(list: Measurement[], date: string, key: keyof MeasureFields): number | undefined {
  const has = list.filter((m) => m[key] !== undefined).sort((a, b) => a.date.localeCompare(b.date))
  const before = has.filter((m) => m.date <= date)
  return (before.length ? before[before.length - 1] : has[0])?.[key]
}
