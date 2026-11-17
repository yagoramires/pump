import { readFileSync } from 'node:fs'
import type { TacoFood } from '../src/types.ts'
import { buildTaco } from './build-taco.ts'

test('buildTaco junta nome e nutrientes; vazio, NA e Tr viram 0', () => {
  const food = 'id,categoryId,name\n1,1,"Arroz, integral, cozido"\n2,1,"Sal"\n'
  const nut = 'foodId,moisture,kcal,kJ,protein,lipids,cholesterol,carbohydrates\n1,70.1,124,517,2.6,1.0,,25.8\n2,0,NA,0,Tr,,,\n'
  expect(buildTaco(food, nut)).toEqual([
    { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
    { id: 2, name: 'Sal', kcal: 0, p: 0, c: 0, f: 0 },
  ])
})
test('taco.json gerado tem todos os alimentos do food.csv', () => {
  const rows = readFileSync('data/taco/food.csv', 'utf8').trim().split('\n').length - 1
  expect((JSON.parse(readFileSync('public/catalog/taco.json', 'utf8')) as TacoFood[]).length).toBe(rows)
})
