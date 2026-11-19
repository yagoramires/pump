import { daysBetween } from '@/lib/date'
import type { Point } from './measurements'

export function scalePoints(points: Point[], w: number, h: number, pad: number): [x: number, y: number][] {
  const first = points[0].date
  const span = daysBetween(first, points[points.length - 1].date) || 1
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals)
  const range = Math.max(...vals) - min || 1
  return points.map((p) => [(daysBetween(first, p.date) / span) * w, pad + (1 - (p.value - min) / range) * (h - 2 * pad)])
}

export const PERIODS = [{ v: '7', label: '7 d' }, { v: '30', label: '30 d' }, { v: '90', label: '90 d' }, { v: 'all', label: 'Tudo' }] as const
export type Period = (typeof PERIODS)[number]['v']
export const inPeriod = (period: Period, date: string, today: string) => period === 'all' || daysBetween(date, today) <= Number(period)
