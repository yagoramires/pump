import type { DietItem, DietLog, DietPlan, TacoFood } from './types'
import { daysBetween } from '@/lib/date'
import { normalize } from '@/lib/text'
import { planItems } from './plan'

export const foodKey = (s: string): string => normalize(s).replace(/[^a-z0-9]+/g, ' ').trim()

export type Food = Pick<DietItem, 'name' | 'per100' | 'source' | 'tacoId'>

export const itemKcal = (i: DietItem) => (i.per100.kcal * i.grams) / 100
export const itemMacros = (i: DietItem) => ({ p: (i.per100.p * i.grams) / 100, c: (i.per100.c * i.grams) / 100, f: (i.per100.f * i.grams) / 100 })
export const kcalOf = (items: DietItem[]) => Math.round(items.reduce((s, i) => s + itemKcal(i), 0))

/** item da IA com kcal 0 = "sem valores" (é assim que fica salvo) */
export const hasValues = (i: Pick<DietItem, 'source' | 'per100'>) => i.source !== 'ia' || i.per100.kcal > 0

export const asFood = ({ name, per100, source, tacoId }: Food): Food => ({ name, per100, source, ...(tacoId !== undefined && { tacoId }) })
export const fromTaco = ({ id, name, kcal, p, c, f }: TacoFood): Food => ({ name, per100: { kcal, p, c, f }, source: 'taco', tacoId: id })

export function recentFoods(plan: DietPlan, log: DietLog, foods: DietItem[], today: string): Food[] {
  const days = Object.keys(log).filter((k) => daysBetween(k, today) < 14).sort().reverse()
  const all = [
    ...foods,
    ...planItems(plan),
    ...days.flatMap((k) => log[k].meals.flatMap((m) => m.items)),
  ]
  const seen = new Map<string, Food>()
  for (const i of all) {
    const key = foodKey(i.name)
    if (!seen.has(key)) seen.set(key, asFood(i))
  }
  return [...seen.values()]
}
