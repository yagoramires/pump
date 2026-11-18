import type { Profile, Sex } from '@/profile/types'
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

// objetivo da dieta (perder*/ganhar*) manda; "manter" ou sem dieta cai no do treino
export const goalDirection = (p: Profile): 'gain' | 'loss' => {
  const diet = p.dietAnamnesis?.goal
  if (diet?.startsWith('perder')) return 'loss'
  if (diet?.startsWith('ganhar')) return 'gain'
  return p.anamnesis?.goal === 'hipertrofia' || p.anamnesis?.goal === 'forca' ? 'gain' : 'loss'
}

export type Metric = keyof MeasureFields | 'fat'
// o que melhora ao subir (gain) ou ao descer (loss); o resto fica neutro. Gordura descendo é sempre bom; sem mudança nunca é
const GOOD: Record<'gain' | 'loss', Metric[]> = { gain: ['weightKg', 'armCm', 'chestCm', 'thighCm'], loss: ['weightKg', 'waistCm', 'hipCm'] }
export const isGood = (m: Metric, dir: 'gain' | 'loss', v: number) =>
  v !== 0 && (m === 'fat' ? v < 0 : v > 0 ? dir === 'gain' && GOOD.gain.includes(m) : dir === 'loss' && GOOD.loss.includes(m))
