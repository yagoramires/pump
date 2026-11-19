import { formatDec } from '@/lib/number'
import { MACRO_KEYS, hasValues, itemKcal } from './food'
import type { DietItem, Macros } from './types'

export const optionLetter = (i: number) => String.fromCharCode(65 + i)
export const optionLabel = (i: number, name?: string) => `Opção ${optionLetter(i)}${name ? ` · ${name}` : ''}`
export const liters = (ml: number) => formatDec(ml / 1000)
export const itemKcalText = (item: DietItem) => `${Math.round(itemKcal(item))} kcal`
export const MACRO_LABELS = { p: 'Proteína', c: 'Carbo', f: 'Gordura' }
export const macroText = (m: Macros) => MACRO_KEYS.map((k) => `${MACRO_LABELS[k][0]} ${formatDec(m[k])}`).join(' · ')
export const macroProgress = (m: Macros, goal?: Macros) => MACRO_KEYS.map((k) => {
  const target = goal?.[k]
  return `${MACRO_LABELS[k][0]} ${Math.round(m[k])}${target ? `/${Math.round(target)}` : ''}`
})
export const portionText = (i: Pick<DietItem, 'portion' | 'grams'>) => (i.portion ? `${i.portion} · ${formatDec(i.grams)} g` : `${formatDec(i.grams)} g`)
export const iaLabel = (i: Pick<DietItem, 'source' | 'per100'>) => (i.source === 'ia' ? (hasValues(i) ? 'estimativa da IA' : 'sem valores') : undefined)
