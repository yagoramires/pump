import type { DayItem, DayMeal, DietDay, DietItem, DietLog, DietPlan } from '../types'

export const dayFromPlan = (plan: DietPlan): DietDay => ({
  meals: structuredClone(plan.meals).map((m) => ({ ...m, done: false })),
  goalKcal: plan.goalKcal,
})

const touched = (d: DietDay) => d.meals.some((m) => m.done || m.items.some((i) => i.skipped || i.swappedFrom || i.extra))

export const ensureDay = (log: DietLog, plan: DietPlan, date: string): DietLog =>
  log[date] && touched(log[date]) ? log : { ...log, [date]: dayFromPlan(plan) }

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
      if (i.skipped || !(m.done || i.extra)) continue
      const x = itemMacros(i)
      kcal += itemKcal(i); p += x.p; c += x.c; f += x.f
    }
  return { kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f), mealsDone: day.meals.filter((m) => m.done).length, mealsTotal: day.meals.length, swaps, extras, skipped }
}

export const isFullDay = (day?: DietDay): boolean => {
  if (!day || !day.meals.length) return false
  return day.meals.every((m) => m.done) && daySummary(day).extras === 0
}

export const sortedMeals = <T extends { time: string }>(meals: T[]): T[] => [...meals].sort((a, b) => a.time.localeCompare(b.time))
