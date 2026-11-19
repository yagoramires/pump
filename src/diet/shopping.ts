import { normalize } from '@/catalog/search'
import { formatDec } from '@/lib/number'
import type { DietPlan } from './types'

export interface ShoppingItem { key: string; name: string; grams: number; count?: { n: number; unit: string } }

/** "2 ovos" → { n: 2, unit: 'ovos' }; sem número na frente não é contável */
const parseCount = (portion?: string) => {
  const m = portion?.trim().match(/^(\d+(?:[.,]\d+)?)\s+(\p{L}+)/u)
  return m ? { n: Number(m[1].replace(',', '.')), unit: m[2] } : undefined
}
const unitKey = (u: string) => normalize(u).replace(/(es|s)$/, '')

/** cada refeição entra 1×/dia; opções e cardápios dividem os dias igualmente */
export function shoppingList(plan: DietPlan, days: number): ShoppingItem[] {
  const acc = new Map<string, { name: string; grams: number; n: number; unit?: string; uKey?: string; countable: boolean }>()
  for (const menu of plan.menus) for (const meal of menu.meals) for (const opt of meal.options) {
    const w = days / (meal.options.length * plan.menus.length)
    for (const it of opt.items) {
      const key = it.tacoId ? `taco:${it.tacoId}` : `n:${normalize(it.name)}`
      const c = parseCount(it.portion)
      const cur = acc.get(key) ?? { name: it.name, grams: 0, n: 0, countable: true }
      cur.grams += it.grams * w
      if (!c || (cur.uKey && cur.uKey !== unitKey(c.unit))) cur.countable = false
      else { cur.n += c.n * w; cur.unit ??= c.unit; cur.uKey = unitKey(c.unit) }
      acc.set(key, cur)
    }
  }
  return [...acc].map(([key, v]) => ({ key, name: v.name, grams: v.grams, ...(v.countable && v.unit ? { count: { n: Math.ceil(v.n - 1e-9), unit: v.unit } } : {}) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export const formatAmount = (grams: number) => {
  const g = Math.round(grams)
  return g >= 1000 ? `${formatDec(g / 1000)} kg` : `${g} g`
}

export const countText = (c: NonNullable<ShoppingItem['count']>) => `≈ ${c.n} ${c.unit}`

export const shoppingText = (items: ShoppingItem[]) => items.map((i) => `• ${i.name} — ${formatAmount(i.grams)}${i.count ? ` (${countText(i.count)})` : ''}`).join('\n')
