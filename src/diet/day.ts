import { countInWeekBefore, hhmm } from '../lib/date'
import type { DayItem, DayMeal, DietDay, DietItem, DietLog, DietPlan, Meal, MealOption, Menu } from './types'
import { round1 } from '@/lib/number'
import { OPTION_LETTERS } from './limits'
import { itemKcal, itemMacros } from './food'

/** campos que só existem no dia; qualquer um preenchido = a pessoa mexeu no dia */
const DAY_MEAL_FLAGS = ['done', 'free', 'swappedMeal', 'optionId'] as const
const DAY_ITEM_FLAGS = ['skipped', 'swappedFrom', 'extra'] as const
// não compila se diet/types.ts ganhar um campo do dia que não está nas listas
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const flagsCovered: [Same<Exclude<keyof DayMeal, keyof Meal | 'items'>, (typeof DAY_MEAL_FLAGS)[number]>, Same<Exclude<keyof DayItem, keyof DietItem | 'original'>, (typeof DAY_ITEM_FLAGS)[number]>] = [true, true]
void flagsCovered

export const dayFromMenu = (menu: Menu): DietDay => ({
  menuId: menu.id,
  menuName: menu.name,
  meals: menu.meals.map(({ options, ...m }) => ({ ...m, done: false, items: structuredClone(options[0]?.items ?? []) })),
  goalKcal: menu.goalKcal,
  goalMacros: menu.goalMacros && { ...menu.goalMacros },
})

export const currentMenu = (plan: DietPlan): Menu | undefined => plan.menus.find((m) => m.id === plan.lastMenuId) ?? plan.menus[0]

export const touched = (d: DietDay) =>
  !!d.free || d.meals.some((m) => DAY_MEAL_FLAGS.some((k) => m[k]) || m.items.some((i) => DAY_ITEM_FLAGS.some((k) => i[k])))

/** o dia como a pessoa vê: o salvo se ela mexeu; senão a cópia do cardápio atual (sem cardápio, nenhum) */
export const dayOf = (log: DietLog, plan: DietPlan, date: string): DietDay | undefined => {
  const saved = log[date]
  if (saved && touched(saved)) return saved
  const menu = currentMenu(plan)
  return menu && dayFromMenu(menu)
}

export const updateDay = (log: DietLog, plan: DietPlan, date: string, f: (d: DietDay) => DietDay): DietLog => {
  const d = dayOf(log, plan, date)
  return d ? { ...log, [date]: f(d) } : log
}

/** esquece o dia: volta a seguir o cardápio atual */
export const resetDay = (log: DietLog, date: string): DietLog => {
  const { [date]: _, ...rest } = log
  return rest
}

const mapMeal = (d: DietDay, mealId: string, f: (m: DayMeal) => DayMeal): DietDay =>
  d.meals.some((m) => m.id === mealId) ? { ...d, meals: d.meals.map((m) => (m.id === mealId ? f(m) : m)) } : d

const mapItem = (d: DietDay, mealId: string, itemId: string, f: (i: DayItem) => DayItem): DietDay =>
  mapMeal(d, mealId, (m) => (m.items.some((i) => i.id === itemId) ? { ...m, items: m.items.map((i) => (i.id === itemId ? f(i) : i)) } : m))

/** livre → nem livre nem feita; senão inverte feita */
export const toggleMeal = (d: DietDay, mealId: string): DietDay => mapMeal(d, mealId, (m) => (m.free ? { ...m, free: false, done: false } : { ...m, done: !m.done }))
const stripDayFields = (i: DayItem): DietItem => {
  const item: DayItem = { ...i }
  for (const k of [...DAY_ITEM_FLAGS, 'original'] as const) delete item[k]
  return item
}
export const swapItem = (d: DietDay, mealId: string, itemId: string, next: DietItem): DietDay =>
  mapItem(d, mealId, itemId, (i) => ({ ...next, swappedFrom: i.swappedFrom ?? i.name, original: i.original ?? stripDayFields(i) }))
export const skipItem = (d: DietDay, mealId: string, itemId: string, skipped: boolean): DietDay =>
  mapItem(d, mealId, itemId, (i) => ({ ...i, skipped }))
export const addExtra = (d: DietDay, mealId: string, item: DietItem): DietDay =>
  mapMeal(d, mealId, (m) => ({ ...m, items: [...m.items, { ...item, extra: true }] }))
export const removeItem = (d: DietDay, mealId: string, itemId: string): DietDay =>
  mapMeal(d, mealId, (m) => (m.items.some((i) => i.id === itemId) ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m))
export const undoSwap = (d: DietDay, mealId: string, itemId: string): DietDay =>
  mapItem(d, mealId, itemId, (i) => (i.original ? { ...i.original } : i))
// extras ficam: já foram comidos e contam na hora em que entram
const keepExtras = (m: DayMeal, items: DietItem[]): DayItem[] => [...structuredClone(items), ...m.items.filter((i) => i.extra)]
export const swapMeal = (d: DietDay, mealId: string, source: { name: string; items: DietItem[] }): DietDay =>
  mapMeal(d, mealId, ({ optionId: _o, ...m }) => ({ ...m, swappedMeal: source.name, items: keepExtras(m, source.items) }))
export const chooseOption = (d: DietDay, mealId: string, option: MealOption): DietDay => {
  const cur = d.meals.find((m) => m.id === mealId)
  if (!cur || (cur.optionId === option.id && !cur.swappedMeal)) return d
  return mapMeal(d, mealId, ({ swappedMeal: _s, ...m }) => ({ ...m, optionId: option.id, items: keepExtras(m, option.items) }))
}
export const setMealFree = (d: DietDay, mealId: string, free: boolean): DietDay => mapMeal(d, mealId, (m) => ({ ...m, free, done: free }))
export const setDayFree = (d: DietDay, free: boolean): DietDay => ({ ...d, free })

export const optionLetter = (i: number) => OPTION_LETTERS[i]

/** opções da refeição no cardápio do dia (apagado: nenhuma); o toggle só aparece com mais de uma e sem troca por outro cardápio */
export const mealOptions = (plan: DietPlan, day: DietDay, mealId: string) => {
  const meal = day.meals.find((m) => m.id === mealId)
  const options = plan.menus.find((m) => m.id === day.menuId)?.meals.find((m) => m.id === mealId)?.options ?? []
  return { options, index: Math.max(0, options.findIndex((o) => o.id === meal?.optionId)), canToggle: options.length > 1 && !meal?.swappedMeal }
}

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
    kcal: Math.round(kcal), p: round1(p), c: round1(c), f: round1(f),
    mealsDone: day.meals.filter((m) => m.done).length, mealsTotal: day.meals.length,
    swaps, extras, skipped, free: day.meals.filter((m) => m.free).length, dayFree: !!day.free,
  }
}

/** usos de "livre" no dia: dia livre vale 1, senão cada refeição livre vale 1 */
export const freeCount = (d: DietDay) => (d.free ? 1 : d.meals.filter((m) => m.free).length)

/** o 1º livre da semana (domingo a sábado) é permitido */
export const firstFreeOfWeek = (log: DietLog, date: string) => countInWeekBefore(log, date, freeCount) === 0

export const dayStatus = (log: DietLog, date: string): 'full' | 'free-ok' | 'off' | 'none' => {
  const day = log[date]
  if (!day) return 'none'
  const allowed = firstFreeOfWeek(log, date) ? 1 : 0
  if (day.free) return allowed ? 'free-ok' : 'off'
  const s = daySummary(day)
  if (s.free > allowed) return 'off'
  return s.mealsTotal > 0 && day.meals.every((m) => m.done || m.free) && s.extras === 0 ? 'full' : 'off'
}

export const sortedMeals = <T extends { time: string }>(meals: T[]): T[] => [...meals].sort((a, b) => a.time.localeCompare(b.time))

/** refeição "da vez": 1ª não feita já no horário; senão a próxima; senão nenhuma */
export const currentMealId = (meals: DayMeal[], now: Date): string | undefined => {
  const t = hhmm(now)
  const open = sortedMeals(meals).filter((m) => !m.done && !m.free)
  return (open.find((m) => m.time && m.time <= t) ?? open[0])?.id
}
