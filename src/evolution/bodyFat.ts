import type { DietGoal, Profile, Sex } from '@/profile/types'
import type { MeasureFields } from './types'
import { round1 } from '@/lib/number'

/** % de gordura (método da Marinha, cm); null sem dado suficiente ou fora do domínio do log */
export function bodyFat(sex: Sex, heightCm: number, m: MeasureFields): number | null {
  const { neckCm: n, waistCm: w, hipCm: h } = m
  if (!(heightCm > 0) || !n || !w) return null
  let v: number
  if (sex === 'M') {
    if (w - n <= 0) return null
    v = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(heightCm)) - 450 + 2
  } else {
    if (!h || w + h - n <= 0) return null
    v = 495 / (1.29579 - 0.35004 * Math.log10(w + h - n) + 0.221 * Math.log10(heightCm)) - 450
  }
  return Number.isFinite(v) ? round1(v) : null
}

export type GoalDirection = 'gain' | 'loss' | null
const DIRECTION: Record<DietGoal, GoalDirection> = { 'perder-rapido': 'loss', perder: 'loss', manter: null, ganhar: 'gain', 'ganhar-rapido': 'gain' }
export const goalDirection = ({ dietGoal }: Profile): GoalDirection =>
  typeof dietGoal === 'string' && Object.prototype.hasOwnProperty.call(DIRECTION, dietGoal) ? DIRECTION[dietGoal] : null

export type Metric = keyof MeasureFields | 'fat'
const GOOD: Record<'gain' | 'loss', Metric[]> = { gain: ['weightKg', 'armCm', 'chestCm', 'thighCm'], loss: ['weightKg', 'waistCm', 'hipCm'] }
export const isGood = (m: Metric, dir: GoalDirection, v: number) =>
  v !== 0 && (m === 'fat' ? v < 0 : dir !== null && (v > 0 ? dir === 'gain' && GOOD.gain.includes(m) : dir === 'loss' && GOOD.loss.includes(m)))
