import { readFileSync } from 'node:fs'
import type { TacoFood } from '../src/diet/types.ts'
import type { Exercise } from '../src/workout/types.ts'
import { EXERCISE_LIST_URL, FOOD_LIST_URL } from '../src/catalog/urls.ts'
import { exerciseList, foodList } from './build-catalog-lists.ts'

const ex = (name: string, muscles: string[], equipment?: string) => ({ name, muscles, equipment }) as Exercise
const json = <T>(f: string) => JSON.parse(readFileSync(`public/catalog/${f}`, 'utf8')) as T
const read = (f: string) => readFileSync(`public/catalog/${f}`, 'utf8')

test('exerciseList agrupa por primeiro músculo, ordena em pt-BR e põe outros por último', () => {
  const out = exerciseList([ex('Zeta', ['peito'], 'barra'), ex('Água', ['peito']), ex('Solo', []), ex('Remada', ['costas'], 'halter')])
  expect(out).toBe(
    'Exercícios do app Pump (catálogo). Copie a linha inteira de um destes exercícios, com o equipamento entre parênteses.\n\n## costas\nRemada (halter)\n\n## peito\nÁgua\nZeta (barra)\n\n## outros\nSolo\n',
  )
})

test('foodList mantém a ordem do taco.json', () => {
  expect(foodList([{ name: 'B' }, { name: 'A' }] as TacoFood[])).toBe('Alimentos da tabela TACO (4ª edição). Use exatamente um destes nomes.\nB\nA\n')
})

test('os .txt commitados batem com os JSONs e têm todos os nomes', () => {
  const exs = json<Exercise[]>('exercises.json')
  const foods = json<TacoFood[]>('taco.json')
  const exTxt = read('exercicios.txt')
  const foodTxt = read('alimentos.txt')
  expect(exTxt).toBe(exerciseList(exs))
  expect(foodTxt).toBe(foodList(foods))
  expect(exTxt.split('\n').filter((l) => l && !l.startsWith('## ')).length).toBe(exs.length + 1) // + a linha de instrução
  expect(foodTxt.split('\n').filter(Boolean)).toHaveLength(foods.length + 1)
  for (const e of exs) expect(exTxt).toContain(e.name)
})

test('as URLs das listas são absolutas no Pages', () => {
  for (const u of [EXERCISE_LIST_URL, FOOD_LIST_URL]) expect(u.startsWith('https://yagoramires.github.io/pump/catalog/')).toBe(true)
})
