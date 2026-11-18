import type { Point } from './measurements'
import { scalePoints } from './chart'

const W = 240
const H = 90

/** linha simples sem eixos (pontos já em ordem de data); a margem de 10% não deixa a linha encostar na borda nem na base */
export function WeightChart({ points, height = 96, empty = 'Registre mais um peso pra ver o gráfico' }: { points: Point[]; height?: number; empty?: string }) {
  if (points.length < 2) {
    return <p className="flex items-center justify-center px-6 text-center text-[13px] text-text-2" style={{ height }}>{empty}</p>
  }
  const xy = scalePoints(points, W, H, H * 0.1).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label="Gráfico de peso">
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={xy.join(' ')} />
      <polyline fill="none" stroke="var(--color-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" points={`0,${H - 0.5} ${W},${H - 0.5}`} />
    </svg>
  )
}
