import type { MeasureFields, Profile, Sex } from '../types'

const r1 = (n: number) => Math.round(n * 10) / 10

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
  return Number.isFinite(v) ? r1(v) : null
}

export const goalDirection = (p?: Profile): 'gain' | 'loss' =>
  p?.anamnesis?.goal === 'hipertrofia' || p?.anamnesis?.goal === 'forca' ? 'gain' : 'loss'
