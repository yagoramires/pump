import { keepIdsByName } from '@/format/keepIds'
import { HHMM } from './limits'
import type { DietItem, DietPlan, Meal, MealOption, Menu } from './types'

export const emptyOption = (): MealOption => ({ id: crypto.randomUUID(), items: [] })
export const emptyMeal = (n: number): Meal => ({ id: crypto.randomUUID(), name: `Refeição ${n}`, time: '', options: [emptyOption()] })
export const emptyMenu = (n: number, meals: Meal[] = []): Menu => ({ id: crypto.randomUUID(), name: `Cardápio ${n}`, meals })

export const planItems = (plan: DietPlan) => plan.menus.flatMap((menu) => menu.meals.flatMap((meal) => meal.options.flatMap((option) => option.items)))
export const mapItems = (plan: DietPlan, f: (i: DietItem) => DietItem): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({ ...m, meals: m.meals.map((ml) => ({ ...ml, options: ml.options.map((o) => ({ ...o, items: o.items.map(f) })) })) })),
})

export const currentMenu = (plan: DietPlan): Menu | undefined => plan.menus.find((m) => m.id === plan.lastMenuId) ?? plan.menus[0]
export const sortedMeals = <T extends { time: string }>(meals: T[]): T[] => [...meals].sort((a, b) => a.time.localeCompare(b.time))

const optionalText = (s?: string) => s?.trim() || undefined
export const normalizeMealTime = (s: string) => s.length === 4 && HHMM.test(`0${s}`) ? `0${s}` : s

export const preparePlan = (plan: DietPlan): DietPlan => ({
  ...plan,
  menus: plan.menus.map((m) => ({
    ...m,
    name: m.name.trim(),
    meals: sortedMeals(m.meals.map((ml) => ({
      ...ml,
      name: ml.name.trim(),
      time: normalizeMealTime(ml.time),
      options: ml.options.map((o) => ({ ...o, name: optionalText(o.name), items: o.items.map((i) => ({ ...i, portion: optionalText(i.portion) })) })),
    }))),
  })),
})

/** cardápio de mesmo nome mantém o id, que é o que lastMenuId guarda */
export const savePlan = (prev: DietPlan, next: DietPlan): DietPlan => {
  const prepared = preparePlan(next)
  const menus = keepIdsByName(prev.menus, prepared.menus, (m) => m.name)
  return { ...prepared, menus, lastMenuId: currentMenu({ menus, lastMenuId: prev.lastMenuId })?.id }
}
