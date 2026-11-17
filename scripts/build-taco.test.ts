import { readFileSync } from 'node:fs'
import type { TacoFood } from '../src/types.ts'
import { buildTaco } from './build-taco.ts'

test('buildTaco junta nome e nutrientes; NA e Tr nos macros viram 0', () => {
  const food = 'id,categoryId,name\n1,1,"Arroz, integral, cozido"\n2,1,"Sal"\n'
  const nut = 'foodId,moisture,kcal,kJ,protein,lipids,cholesterol,carbohydrates\n1,70.1,124,517,2.6,1.0,,25.8\n2,0,0,0,Tr,NA,,\n'
  expect(buildTaco(food, nut)).toEqual([
    { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
    { id: 2, name: 'Sal', kcal: 0, p: 0, c: 0, f: 0 },
  ])
})
test('buildTaco descarta linhas sem kcal (vazia ou NA) ou sem nutrientes', () => {
  const food = 'id,categoryId,name\n1,1,"Leite, de vaca, integral"\n2,1,"Sal, grosso"\n3,1,"Arroz, tipo 1, cozido"\n4,1,"Sem linha"\n'
  const nut = 'foodId,moisture,kcal,kJ,protein,lipids,cholesterol,carbohydrates\n1,,,,,,,\n2,0,NA,0,0,0,,0\n3,69.1,128,537,2.5,0.2,,28.1\n'
  expect(buildTaco(food, nut).map((f) => f.id)).toEqual([3])
})
test('taco.json gerado tem todos os alimentos do food.csv com kcal', () => {
  const kcal = new Map(readFileSync('data/taco/nutrients.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).map((r) => [r[0], r[2].trim()]))
  const rows = readFileSync('data/taco/food.csv', 'utf8').trim().split('\n').slice(1).filter((l) => { const k = kcal.get(l.split(',')[0]); return k && k !== 'NA' }).length
  const json = JSON.parse(readFileSync('public/catalog/taco.json', 'utf8')) as TacoFood[]
  expect(json.length).toBe(rows)
  expect(json.length).toBeLessThan(597)
})
