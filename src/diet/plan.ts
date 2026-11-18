import type { DietPlan, Menu } from './types'
import { sortedMeals } from './day'

export const emptyMenu = (n: number): Menu => ({ id: crypto.randomUUID(), name: `Cardápio ${n}`, meals: [{ id: crypto.randomUUID(), name: 'Refeição 1', time: '', options: [{ id: crypto.randomUUID(), items: [] }] }] })

export const savePlan = (prev: DietPlan, next: DietPlan): DietPlan => ({
  ...next,
  menus: next.menus.map((m) => ({ ...m, meals: sortedMeals(m.meals) })),
  lastMenuId: next.menus.some((m) => m.id === prev.lastMenuId) ? prev.lastMenuId : next.menus[0]?.id,
})
