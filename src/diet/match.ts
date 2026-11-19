import { normalize } from '@/lib/text'
import type { DietItem, TacoFood } from './types'

/** Identidade de um alimento (import, alimento próprio repetido, recentes): como `normalize`, mas pontuação vira espaço e a comparação é por palavras. */
export const foodKey = (s: string): string => normalize(s).replace(/[^a-z0-9]+/g, ' ').trim()

// só conectivos; "com", "sem", "cru", "cozido" mudam o alimento
const IGNORED = new Set(['de', 'da', 'do', 'e', 'em'])

export function matchFood(
  name: string,
  grams: number,
  aiKcal: number | undefined,
  taco: TacoFood[],
  customs: DietItem[],
): { kind: 'custom'; item: DietItem } | { kind: 'exact' | 'words'; food: TacoFood } | null {
  const key = foodKey(name)
  const item = customs.find((c) => foodKey(c.name) === key)
  if (item) return { kind: 'custom', item }
  const exact = taco.find((f) => foodKey(f.name) === key)
  if (exact) return { kind: 'exact', food: exact }

  // sem kcal da IA não dá pra escolher entre cru, cozido, pó...: só vale o nome igual
  const words = key.split(' ').filter((w) => w && !IGNORED.has(w))
  if (aiKcal === undefined || !words.length) return null
  const food = taco
    .filter((f) => {
      const has = new Set(foodKey(f.name).split(' '))
      return words.every((w) => has.has(w))
    })
    .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name, 'pt-BR'))
    .find((f) => Math.abs((f.kcal * grams) / 100 - aiKcal) <= aiKcal * 0.35)
  return food ? { kind: 'words', food } : null
}
