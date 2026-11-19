import { readFileSync } from 'node:fs'
import type { Exercise, TacoFood } from '../src/catalog/types.ts'
import { EXERCISE_LIST, EXERCISES_JSON, FOOD_LIST, TACO_JSON } from '../src/catalog/urls.ts'
import { catalogPath, exerciseList, foodList, readCatalog } from './build-catalog-lists.ts'

const ex = (name: string, muscles: string[], equipment?: string) => ({ name, muscles, equipment }) as Exercise
const read = (f: string) => readFileSync(catalogPath(f), 'utf8')

test('exerciseList agrupa por primeiro músculo, ordena em pt-BR e põe outros por último', () => {
  const out = exerciseList([ex('Zeta', ['peito'], 'barra'), ex('Água', ['peito']), ex('Solo', []), ex('Remada', ['costas'], 'halter')])
  expect(out.slice(out.indexOf('## ')).trimEnd().split('\n').filter(Boolean)).toEqual(['## costas', 'Remada (halter)', '## peito', 'Água', 'Zeta (barra)', '## outros', 'Solo'])
})

test('foodList mantém a ordem do taco.json', () => {
  expect(foodList([{ name: 'B' }, { name: 'A' }] as TacoFood[])).toBe('Alimentos da tabela TACO (4ª edição). Use exatamente um destes nomes.\nB\nA\n')
})

test('os .txt commitados batem com os JSONs e têm todos os nomes', () => {
  const exs = readCatalog<Exercise[]>(EXERCISES_JSON)
  const foods = readCatalog<TacoFood[]>(TACO_JSON)
  const exTxt = read(EXERCISE_LIST)
  const foodTxt = read(FOOD_LIST)
  expect(exTxt).toBe(exerciseList(exs))
  expect(foodTxt).toBe(foodList(foods))
  expect(exTxt.split('\n').filter((l) => l && !l.startsWith('## ')).length).toBe(exs.length + 1) // + a linha de instrução
  expect(foodTxt.split('\n').filter(Boolean)).toHaveLength(foods.length + 1)
  for (const e of exs) expect(exTxt).toContain(e.name)
})
