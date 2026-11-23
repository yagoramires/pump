import type { DietItem, Menu } from './types'
import { MAX_ITEMS } from './limits'
import { macrosOf } from './food'

type At = { optionId: string; index: number }

const mapOptions = (menu: Menu, f: (o: Menu['meals'][number]['options'][number]) => Menu['meals'][number]['options'][number]): Menu => ({
  ...menu,
  meals: menu.meals.map((m) => ({ ...m, options: m.options.map(f) })),
})

/** move um alimento entre opções de qualquer refeição do cardápio; `to.index` é a posição depois de tirar da origem */
export function moveFood(menu: Menu, from: At, to: At): Menu {
  const options = menu.meals.flatMap((m) => m.options)
  const item = options.find((o) => o.id === from.optionId)?.items[from.index]
  const target = options.find((o) => o.id === to.optionId)
  if (!item || !target) return menu
  if (from.optionId !== to.optionId && target.items.length >= MAX_ITEMS) return menu
  const removed = mapOptions(menu, (o) => (o.id === from.optionId ? { ...o, items: o.items.filter((_, i) => i !== from.index) } : o))
  return mapOptions(removed, (o) => {
    if (o.id !== to.optionId) return o
    const items = [...o.items]
    items.splice(to.index, 0, item)
    return { ...o, items }
  })
}

const KCAL_PER_G = { p: 4, c: 4, f: 9 } as const

export const macroSplit = (items: DietItem[]): { key: 'p' | 'c' | 'f'; grams: number; kcal: number }[] => {
  const m = macrosOf(items)
  return (['p', 'c', 'f'] as const).map((key) => ({ key, grams: m[key], kcal: m[key] * KCAL_PER_G[key] }))
}
