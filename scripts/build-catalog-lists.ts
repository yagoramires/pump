import { readFileSync, writeFileSync } from 'node:fs'
import type { TacoFood } from '../src/diet/types.ts'
import type { Exercise } from '../src/workout/types.ts'
import { EXERCISE_LIST, FOOD_LIST } from '../src/catalog/urls.ts'

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

if (import.meta.main) {
  const read = <T>(f: string) => JSON.parse(readFileSync(`public/catalog/${f}`, 'utf8')) as T
  writeFileSync(`public/catalog/${EXERCISE_LIST}`, exerciseList(read('exercises.json')))
  writeFileSync(`public/catalog/${FOOD_LIST}`, foodList(read('taco.json')))
  console.log(`public/catalog/${EXERCISE_LIST} e ${FOOD_LIST} escritos`)
}
