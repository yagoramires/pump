import { parseDayKey, todayKey, weekday } from '../lib/date'
import type { DayItem, DayMeal, DietDay, DietItem, DietLog, DietPlan, Menu } from '../types'

export const dayFromMenu = (menu: Menu): DietDay => ({
  menuId: menu.id,
  menuName: menu.name,
  meals: menu.meals.map(({ options, ...m }) => ({ ...m, done: false, items: structuredClone(options[0]?.items ?? []) })),
  goalKcal: menu.goalKcal,
  goalMacros: menu.goalMacros && { ...menu.goalMacros },
})

export const currentMenu = (plan: DietPlan): Menu | undefined => plan.menus.find((m) => m.id === plan.lastMenuId) ?? plan.menus[0]

const touched = (d: DietDay) =>
  d.free || d.meals.some((m) => m.done || m.free || m.swappedMeal || m.items.some((i) => i.skipped || i.swappedFrom || i.extra))

export const ensureDay = (log: DietLog, plan: DietPlan, date: string): DietLog => {
  const menu = currentMenu(plan)
  return !menu || (log[date] && touched(log[date])) ? log : { ...log, [date]: dayFromMenu(menu) }
}

export const setDayMenu = (log: DietLog, plan: DietPlan, date: string, menuId: string): DietLog => {
  const menu = plan.menus.find((m) => m.id === menuId)
  return menu ? { ...log, [date]: dayFromMenu(menu) } : log
}

const mapMeal = (d: DietDay, mealId: string, f: (m: DayMeal) => DayMeal): DietDay =>
  d.meals.some((m) => m.id === mealId) ? { ...d, meals: d.meals.map((m) => (m.id === mealId ? f(m) : m)) } : d

const mapItem = (d: DietDay, mealId: string, itemId: string, f: (i: DayItem) => DayItem): DietDay =>
  mapMeal(d, mealId, (m) => (m.items.some((i) => i.id === itemId) ? { ...m, items: m.items.map((i) => (i.id === itemId ? f(i) : i)) } : m))

export const toggleMeal = (d: DietDay, mealId: string): DietDay => mapMeal(d, mealId, (m) => ({ ...m, done: !m.done }))
export const swapItem = (d: DietDay, mealId: string, itemId: string, next: DietItem): DietDay =>
  mapItem(d, mealId, itemId, (i) => ({ ...next, swappedFrom: i.swappedFrom ?? i.name }))
export const skipItem = (d: DietDay, mealId: string, itemId: string, skipped: boolean): DietDay =>
  mapItem(d, mealId, itemId, (i) => ({ ...i, skipped }))
export const addExtra = (d: DietDay, mealId: string, item: DietItem): DietDay =>
  mapMeal(d, mealId, (m) => ({ ...m, items: [...m.items, { ...item, extra: true }] }))
export const removeItem = (d: DietDay, mealId: string, itemId: string): DietDay =>
  mapMeal(d, mealId, (m) => (m.items.some((i) => i.id === itemId) ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m))
export const undoSwap = (d: DietDay, mealId: string, itemId: string, original: DietItem): DietDay =>
  mapItem(d, mealId, itemId, () => ({ ...original }))
// extras ficam: já foram comidos e contam na hora em que entram
export const swapMeal = (d: DietDay, mealId: string, source: { name: string; items: DietItem[] }): DietDay =>
  mapMeal(d, mealId, (m) => ({ ...m, swappedMeal: source.name, items: [...structuredClone(source.items), ...m.items.filter((i) => i.extra)] }))
export const setMealFree = (d: DietDay, mealId: string, free: boolean): DietDay => mapMeal(d, mealId, (m) => ({ ...m, free, done: free }))
export const setDayFree = (d: DietDay, free: boolean): DietDay => ({ ...d, free })

export const itemKcal = (i: DietItem) => (i.per100.kcal * i.grams) / 100
export const itemMacros = (i: DietItem) => ({ p: (i.per100.p * i.grams) / 100, c: (i.per100.c * i.grams) / 100, f: (i.per100.f * i.grams) / 100 })

const r1 = (n: number) => Math.round(n * 10) / 10

export const daySummary = (day: DietDay) => {
  let kcal = 0, p = 0, c = 0, f = 0, swaps = 0, extras = 0, skipped = 0
  for (const m of day.meals)
    for (const i of m.items) {
      if (i.swappedFrom) swaps++
      if (i.skipped) skipped++
      if (i.extra) extras++
      if (day.free || m.free || i.skipped || !(m.done || i.extra)) continue
      const x = itemMacros(i)
      kcal += itemKcal(i); p += x.p; c += x.c; f += x.f
    }
  return {
    kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f),
    mealsDone: day.meals.filter((m) => m.done).length, mealsTotal: day.meals.length,
    swaps, extras, skipped, free: day.meals.filter((m) => m.free).length, dayFree: !!day.free,
  }
}

/** dia 100% sem contar a folga semanal (ver dayStatus) */
export const isFullDay = (day?: DietDay): boolean => {
  if (!day || !day.meals.length || day.free) return false
  const s = daySummary(day)
  return s.mealsDone === s.mealsTotal && s.extras === 0 && s.free === 0
}

/** usos de "livre" na semana (domingo a sábado) de `date`, antes dele; dia livre vale 1, senão cada refeição livre vale 1 */
export const freeUses = (log: DietLog, date: string): number => {
  const start = parseDayKey(date)
  start.setDate(start.getDate() - weekday(date))
  const from = todayKey(start)
  let n = 0
  for (const [k, d] of Object.entries(log))
    if (k >= from && k < date) n += d.free ? 1 : d.meals.filter((m) => m.free).length
  return n
}

export const dayStatus = (log: DietLog, date: string): 'full' | 'free-ok' | 'off' | 'none' => {
  const day = log[date]
  if (!day) return 'none'
  const allowed = freeUses(log, date) === 0 ? 1 : 0
  if (day.free) return allowed ? 'free-ok' : 'off'
  const s = daySummary(day)
  if (s.free > allowed) return 'off'
  return s.mealsTotal > 0 && day.meals.every((m) => m.done || m.free) && s.extras === 0 ? 'full' : 'off'
}

export const sortedMeals = <T extends { time: string }>(meals: T[]): T[] => [...meals].sort((a, b) => a.time.localeCompare(b.time))
