import type { DietPlan, Menu } from './types'
import { sortedMeals } from './day'


/** esqueleto do "do zero": uma refeição com uma opção vazia */
export const emptyMenu = (n: number): Menu => ({ id: crypto.randomUUID(), name: `Cardápio ${n}`, meals: [{ id: crypto.randomUUID(), name: 'Refeição 1', time: '', options: [{ id: crypto.randomUUID(), items: [] }] }] })

/** o plano como fica salvo: refeições por horário e o último cardápio usado, se ele ainda existe (senão o 1º) */
export const savePlan = (prev: DietPlan, next: DietPlan): DietPlan => ({
  ...next,
  menus: next.menus.map((m) => ({ ...m, meals: sortedMeals(m.meals) })),
  lastMenuId: next.menus.some((m) => m.id === prev.lastMenuId) ? prev.lastMenuId : next.menus[0]?.id,
})
