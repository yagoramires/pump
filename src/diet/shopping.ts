import { normalize } from '@/lib/text'
import { formatDec, plural } from '@/lib/number'
import { pluralWord, singularWord } from './units'
import type { DietPlan } from './types'

export interface ShoppingItem { key: string; name: string; grams: number; count?: { n: number; unit: string } }

const METRIC = new Set(['g', 'kg', 'mg', 'ml', 'l', 'litro', 'grama', 'quilo', 'quilograma', 'miligrama', 'mililitro'])
/** sigla curta (un, col, cs, cc): fica como está, sem singular/plural */
const isAbbr = (w: string) => w.length <= 3 && !/[aeiouãõ]$/i.test(w)
const canonHead = (w: string) => (isAbbr(w) ? w.toLowerCase() : singularWord(w))
/** "2 ovos" → { n: 2, unit: 'ovo' }; a unidade é a expressão toda ("colher de sopa"), no singular; gramas/ml não são contáveis */
const parseCount = (portion?: string) => {
  const m = portion?.trim().match(/^(\d+(?:[.,]\d+)?)\s+(\p{L}[\p{L} ]*)/u)
  if (!m) return undefined
  const [head, ...rest] = m[2].trim().split(/\s+/)
  const h = canonHead(head)
  return METRIC.has(normalize(h)) ? undefined : { n: Number(m[1].replace(',', '.')), unit: [h, ...rest.map((r) => r.toLowerCase())].join(' ') }
}

/** cada refeição entra 1×/dia; opções e cardápios dividem os dias igualmente */
export function shoppingList(plan: DietPlan, days: number): ShoppingItem[] {
  const acc = new Map<string, { name: string; grams: number; n: number; unit?: string; countable: boolean }>()
  for (const menu of plan.menus) for (const meal of menu.meals) for (const opt of meal.options) {
    const w = days / (meal.options.length * plan.menus.length)
    for (const it of opt.items) {
      const key = it.tacoId ? `taco:${it.tacoId}` : `n:${normalize(it.name)}`
      const c = parseCount(it.portion)
      const cur = acc.get(key) ?? { name: it.name, grams: 0, n: 0, countable: true }
      cur.grams += it.grams * w
      if (!c || (cur.unit && cur.unit !== c.unit)) cur.countable = false
      else { cur.n += c.n * w; cur.unit ??= c.unit }
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

export const countText = (c: NonNullable<ShoppingItem['count']>) => {
  const [head, ...rest] = c.unit.split(' ')
  return `≈ ${plural(c.n, c.unit, [isAbbr(head) ? head : pluralWord(head), ...rest].join(' '))}`
}

export const shoppingText = (items: ShoppingItem[]) => items.map((i) => `• ${i.name} — ${formatAmount(i.grams)}${i.count ? ` (${countText(i.count)})` : ''}`).join('\n')
