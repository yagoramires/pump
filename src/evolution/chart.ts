import { daysBetween } from '@/lib/date'
import type { Point } from './measurements'

/** pontos (por data) em coordenadas: x proporcional aos dias, y entre o mínimo e o máximo com `pad` em cima e embaixo */
export function scalePoints(points: Point[], w: number, h: number, pad: number): [x: number, y: number][] {
  const first = points[0].date
  const span = daysBetween(first, points[points.length - 1].date) || 1
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals)
  const range = Math.max(...vals) - min || 1
  return points.map((p) => [(daysBetween(first, p.date) / span) * w, pad + (1 - (p.value - min) / range) * (h - 2 * pad)])
}
