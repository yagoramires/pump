import type { Point } from './measurements'
import { scalePoints } from './chart'

const W = 54
const H = 20

/** minilinha sem eixo; desenho puro (o shadcn não tem sparkline) */
export function Sparkline({ points }: { points: Point[] }) {
  if (points.length < 2) return null
  const xy = scalePoints(points, W, H, 2).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-13.5 shrink-0" aria-hidden="true">
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={xy} />
    </svg>
  )
}
