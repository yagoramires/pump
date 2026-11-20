import type { Sex } from '@/profile/types'
import type { MeasureFields } from './types'
import { inRange, round1 } from '@/lib/number'
import { FAT_PCT } from './limits'

/** só a fórmula feminina usa o quadril */
export const usesHip = (sex: Sex) => sex === 'F'

/** % de gordura (método da Marinha, cm); null sem dado suficiente, fora do domínio do log ou com resultado implausível */
export function bodyFat(sex: Sex, heightCm: number, m: MeasureFields): number | null {
  const { neckCm: n, waistCm: w, hipCm: h } = m
  if (!(heightCm > 0) || !n || !w) return null
  let v: number
  if (!usesHip(sex)) {
    if (w - n <= 0) return null
    // +2: ajuste da variante do gorgonoid (calculadora de referência dos testes) sobre a fórmula da Marinha
    v = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(heightCm)) - 450 + 2
  } else {
    if (!h || w + h - n <= 0) return null
    v = 495 / (1.29579 - 0.35004 * Math.log10(w + h - n) + 0.221 * Math.log10(heightCm)) - 450
  }
  return inRange(v, ...FAT_PCT) ? round1(v) : null
}
