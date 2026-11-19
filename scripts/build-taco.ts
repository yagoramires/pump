import { readFileSync, writeFileSync } from 'node:fs'
import type { TacoFood } from '../src/catalog/types.ts'
import { catalogPath, writeLists } from './build-catalog-lists.ts'
import { TACO_JSON } from '../src/catalog/urls.ts'
import { round1 } from '../src/lib/number.ts'

// shortcut: CSV simples (aspas duplas, sem quebra de linha dentro de campo), basta pro dataset da TACO
function parseCsv(text: string): Record<string, string>[] {
  const rows = text.trim().split(/\r?\n/).map((l) => [...l.matchAll(/"([^"]*)"|([^,]*)(,|$)/g)].filter((m) => m[0] !== '').map((m) => m[1] ?? m[2]))
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

// nos macros, vazio, NA e Tr (traço) viram 0; 1 casa decimal no máximo
const num = (v: string | undefined): number => {
  const n = Number(v)
  return Number.isFinite(n) && v?.trim() ? round1(n) : 0
}

export function buildTaco(foodCsv: string, nutrientsCsv: string): TacoFood[] {
  const nut = new Map(parseCsv(nutrientsCsv).map((r) => [Number(r.foodId), r]))
  return parseCsv(foodCsv).flatMap((f) => {
    const n = nut.get(Number(f.id))
    // sem kcal (vazia ou NA) a linha não tem dados: entraria como 0 kcal com cara de valor real
    const k = n?.kcal?.trim()
    if (!n || !k || k === 'NA') return []
    return [{ id: Number(f.id), name: f.name, kcal: num(n.kcal), p: num(n.protein), c: num(n.carbohydrates), f: num(n.lipids) }]
  })
}

if (import.meta.main) {
  const out = buildTaco(readFileSync('data/taco/food.csv', 'utf8'), readFileSync('data/taco/nutrients.csv', 'utf8'))
  writeFileSync(catalogPath(TACO_JSON), JSON.stringify(out))
  console.log(`${catalogPath(TACO_JSON)} escrito (${out.length} alimentos)`)
  writeLists()
}
