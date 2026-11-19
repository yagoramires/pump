import { readFileSync } from 'node:fs'
import type { TacoFood } from '../src/diet/types.ts'
import type { Exercise } from '../src/workout/types.ts'
import { exerciseList, foodList } from './build-catalog-lists.ts'

const ex = (name: string, muscles: string[], equipment?: string) => ({ name, muscles, equipment }) as Exercise
const json = <T>(f: string) => JSON.parse(readFileSync(`public/catalog/${f}`, 'utf8')) as T
const read = (f: string) => readFileSync(`public/catalog/${f}`, 'utf8')

test('exerciseList agrupa por primeiro músculo, ordena em pt-BR e põe outros por último', () => {
  const out = exerciseList([ex('Zeta', ['peito'], 'barra'), ex('Água', ['peito']), ex('Solo', []), ex('Remada', ['costas'], 'halter')])
  expect(out).toBe(
    'Exercícios do app Pump (catálogo). Use exatamente um destes nomes.\n\n## costas\nRemada (halter)\n\n## peito\nÁgua\nZeta (barra)\n\n## outros\nSolo\n',
  )
})

test('foodList mantém a ordem do taco.json', () => {
  expect(foodList([{ name: 'B' }, { name: 'A' }] as TacoFood[])).toBe('Alimentos da tabela TACO (4ª edição). Use exatamente um destes nomes.\nB\nA\n')
})

test('os .txt commitados batem com os JSONs e têm todos os nomes', () => {
  const exs = json<Exercise[]>('exercises.json')
  const foods = json<TacoFood[]>('taco.json')
  expect(read('exercicios.txt')).toBe(exerciseList(exs))
  expect(read('alimentos.txt')).toBe(foodList(foods))
  expect(exs).toHaveLength(876)
  expect(foods).toHaveLength(591)
  for (const e of exs) expect(read('exercicios.txt')).toContain(e.name)
})
