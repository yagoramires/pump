import type { Point } from './measurements'
import { scalePoints } from './chart'

const W = 240
const H = 90

const toXy = (points: Point[]) => scalePoints(points, W, H, H * 0.1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

export function LoadChart({ top, total }: { top: Point[]; total: Point[] }) {
  if (top.length < 2) {
    return <p className="flex h-24 items-center justify-center px-6 text-center text-meta text-text-2">Poucos registros nesse período</p>
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-24 w-full" role="img" aria-label="Gráfico de carga e volume">
      <polyline fill="none" stroke="var(--color-text-2)" strokeWidth={1.6} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={toXy(total)} />
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={toXy(top)} />
      <polyline fill="none" stroke="var(--color-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" points={`0,${H - 0.5} ${W},${H - 0.5}`} />
    </svg>
  )
}
