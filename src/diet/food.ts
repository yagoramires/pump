import type { DietItem, DietLog, DietPlan, Macros, TacoFood } from './types'
import type { ItemReport } from './dietFormat'
import { daysBetween } from '@/lib/date'
import { formatDec } from '@/lib/number'
import { foodKey } from './match'

/** alimento sem quantidade: o que as listas do FoodPicker mostram e o que vira DietItem */
export type Food = Pick<DietItem, 'name' | 'per100' | 'source' | 'tacoId'>

export const itemKcal = (i: DietItem) => (i.per100.kcal * i.grams) / 100
export const itemMacros = (i: DietItem) => ({ p: (i.per100.p * i.grams) / 100, c: (i.per100.c * i.grams) / 100, f: (i.per100.f * i.grams) / 100 })
export const kcalOf = (items: DietItem[]) => Math.round(items.reduce((s, i) => s + itemKcal(i), 0))
export const macroText = (m: Macros) => `P ${formatDec(m.p)} · C ${formatDec(m.c)} · G ${formatDec(m.f)}`
export const portionText = (i: Pick<DietItem, 'portion' | 'grams'>) => (i.portion ? `${i.portion} · ${formatDec(i.grams)} g` : `${formatDec(i.grams)} g`)

/** item da IA com kcal 0 = "sem valores" (é assim que fica salvo) */
export const hasValues = (i: Pick<DietItem, 'source' | 'per100'>) => i.source !== 'ia' || i.per100.kcal > 0
/** aviso de origem: número da IA nunca aparece sem rótulo */
export const iaLabel = (i: Pick<DietItem, 'source' | 'per100'>) => (i.source === 'ia' ? (hasValues(i) ? 'estimativa da IA' : 'sem valores') : undefined)
/** rótulo da revisão do import: como o item casou com a TACO */
export const matchLabel = (i: DietItem, r?: ItemReport): { text: string; warn: boolean } | undefined => {
  if (r?.match === 'none') return { text: 'sem valores — escolha na TACO', warn: true }
  if (i.source === 'ia' && hasValues(i)) return { text: 'estimativa da IA', warn: true }
  if (r?.match === 'words' && r.aiName !== i.name) return { text: `na TACO: ${i.name}`, warn: false }
}

export const asFood = ({ name, per100, source, tacoId }: Food): Food => ({ name, per100, source, ...(tacoId !== undefined && { tacoId }) })
export const fromTaco = ({ id, name, kcal, p, c, f }: TacoFood): Food => ({ name, per100: { kcal, p, c, f }, source: 'taco', tacoId: id })

/** criados, do cardápio e dos últimos 14 dias; o primeiro visto de cada alimento (pelo foodKey) vence */
export function recentFoods(plan: DietPlan, log: DietLog, foods: DietItem[], today: string): Food[] {
  const days = Object.keys(log).filter((k) => daysBetween(k, today) < 14).sort().reverse()
  const all = [
    ...foods,
    ...plan.menus.flatMap((m) => m.meals.flatMap((ml) => ml.options.flatMap((o) => o.items))),
    ...days.flatMap((k) => log[k].meals.flatMap((m) => m.items)),
  ]
  const seen = new Map<string, Food>()
  for (const i of all) if (!seen.has(foodKey(i.name))) seen.set(foodKey(i.name), asFood(i))
  return [...seen.values()]
}
