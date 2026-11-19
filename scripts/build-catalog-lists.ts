import { readFileSync, writeFileSync } from 'node:fs'
import type { Exercise, TacoFood } from '../src/catalog/types.ts'
import { CATALOG_DIR, EXERCISE_LIST, EXERCISES_JSON, FOOD_LIST, TACO_JSON } from '../src/catalog/urls.ts'

export const catalogPath = (file: string) => `public/${CATALOG_DIR}${file}`

const br = (a: string, b: string) => a.localeCompare(b, 'pt-BR')

export function exerciseList(exercises: Exercise[]): string {
  const groups = new Map<string, string[]>()
  for (const e of exercises) {
    const k = e.muscles[0] || 'outros'
    groups.set(k, [...(groups.get(k) ?? []), e.equipment ? `${e.name} (${e.equipment})` : e.name])
  }
  const keys = [...groups.keys()].filter((k) => k !== 'outros').sort(br)
  if (groups.has('outros')) keys.push('outros')
  const blocks = keys.map((k) => `## ${k}\n${groups.get(k)!.sort(br).join('\n')}\n`)
  return `Exercícios do app Pump (catálogo). Copie a linha inteira de um destes exercícios, com o equipamento entre parênteses.\n\n${blocks.join('\n')}`
}

export const foodList = (foods: TacoFood[]): string =>
  `Alimentos da tabela TACO (4ª edição). Use exatamente um destes nomes.\n${foods.map((f) => f.name).join('\n')}\n`

export const readCatalog = <T>(file: string) => JSON.parse(readFileSync(catalogPath(file), 'utf8')) as T

/** reescreve as listas .txt a partir dos JSONs em public/ */
export function writeLists() {
  writeFileSync(catalogPath(EXERCISE_LIST), exerciseList(readCatalog(EXERCISES_JSON)))
  writeFileSync(catalogPath(FOOD_LIST), foodList(readCatalog(TACO_JSON)))
  console.log(`${catalogPath(EXERCISE_LIST)} e ${FOOD_LIST} escritos`)
}

if (import.meta.main) writeLists()
