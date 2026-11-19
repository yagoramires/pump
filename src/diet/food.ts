import type { DietItem, Macros, TacoFood } from './types'
import { normalize } from '@/lib/text'

export const foodKey = (s: string): string => normalize(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export type Food = Pick<DietItem, 'name' | 'per100' | 'source' | 'tacoId'>

export const MACRO_KEYS = ['p', 'c', 'f'] as const

export const itemKcal = (i: DietItem) => (i.per100.kcal * i.grams) / 100
export const kcalOf = (items: DietItem[]) => Math.round(items.reduce((s, i) => s + itemKcal(i), 0))
export const macrosOf = (items: DietItem[]): Macros => {
  const t = { p: 0, c: 0, f: 0 }
  for (const i of items) for (const k of MACRO_KEYS) t[k] += (i.per100[k] * i.grams) / 100
  return t
}

/** item da IA com kcal 0 = "sem valores" (é assim que fica salvo) */
export const hasValues = (i: Pick<DietItem, 'source' | 'per100'>) => i.source !== 'ia' || i.per100.kcal > 0

export const asFood = ({ name, per100, source, tacoId }: Food): Food => ({ name, per100, source, ...(tacoId !== undefined && { tacoId }) })
export const fromTaco = ({ id, name, kcal, p, c, f }: TacoFood): Food => ({ name, per100: { kcal, p, c, f }, source: 'taco', tacoId: id })
