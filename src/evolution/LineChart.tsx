import { daysBetween } from '../lib/date'

const W = 240
const H = 90

/** linha simples sem eixos; x proporcional aos dias, y entre o mínimo e o máximo */
export function LineChart({ points, height = 96, empty = 'Registre mais um peso pra ver o gráfico' }: { points: { date: string; value: number }[]; height?: number; empty?: string }) {
  if (points.length < 2) {
    return <p className="flex items-center justify-center px-6 text-center text-[13px] text-text-2" style={{ height }}>{empty}</p>
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0].date
  const span = daysBetween(first, sorted[sorted.length - 1].date) || 1
  const vals = sorted.map((p) => p.value)
  const min = Math.min(...vals)
  const range = Math.max(...vals) - min || 1
  // margem de 10% em cima e embaixo: a linha não encosta na borda nem na base
  const xy = sorted.map((p) => `${((daysBetween(first, p.date) / span) * W).toFixed(1)},${(H * 0.1 + (1 - (p.value - min) / range) * H * 0.8).toFixed(1)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label="Gráfico de peso">
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={xy.join(' ')} />
      <polyline fill="none" stroke="var(--color-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" points={`0,${H - 0.5} ${W},${H - 0.5}`} />
    </svg>
  )
}
