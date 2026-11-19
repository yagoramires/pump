import type { DietGoal, Profile } from '@/profile/types'
import type { MeasureFields } from './types'
import { isKeyOf } from '@/lib/utils'

export type GoalDirection = 'gain' | 'loss' | null
const DIRECTION: Record<DietGoal, GoalDirection> = { 'perder-rapido': 'loss', perder: 'loss', manter: null, ganhar: 'gain', 'ganhar-rapido': 'gain' }
export const goalDirection = ({ dietGoal }: Profile): GoalDirection => (isKeyOf(DIRECTION, dietGoal) ? DIRECTION[dietGoal] : null)

export type Metric = keyof MeasureFields | 'fat'
const GOOD: Record<'gain' | 'loss', Metric[]> = { gain: ['weightKg', 'armCm', 'chestCm', 'thighCm'], loss: ['weightKg', 'waistCm', 'hipCm'] }
export const isGood = (m: Metric, dir: GoalDirection, v: number) =>
  v !== 0 && (m === 'fat' ? v < 0 : dir !== null && (v > 0 ? dir === 'gain' && GOOD.gain.includes(m) : dir === 'loss' && GOOD.loss.includes(m)))
