import { expect, test } from 'vitest'
import type { DietPlan, Meal } from './types'
import { emptyMeal, emptyMenu, savePlan } from './plan'

const meal = (id: string, time: string): Meal => ({ id, name: id, time, options: [{ id: `${id}o`, items: [] }] })
const plan: DietPlan = { menus: [{ id: 'A', name: 'A', meals: [meal('jantar', '20:00'), meal('cafe', '7:00')] }, { id: 'B', name: 'B', meals: [] }] }

test('savePlan ordena as refeições e mantém o último cardápio se ele ainda existe; senão o 1º', () => {
  const out = savePlan({ menus: [], lastMenuId: 'B' }, plan)
  expect(out.menus[0].meals.map((m) => m.id)).toEqual(['cafe', 'jantar'])
  expect(out.menus[0].meals[0].time).toBe('07:00')
  expect(out.lastMenuId).toBe('B')
  expect(savePlan({ menus: [], lastMenuId: 'sumiu' }, plan).lastMenuId).toBe('A')
  expect(savePlan({ menus: [] }, { menus: [] }).lastMenuId).toBeUndefined()
})

test('emptyMenu: uma refeição com uma opção vazia', () => {
  expect(emptyMenu(2, [emptyMeal(1)])).toMatchObject({ name: 'Cardápio 2', meals: [{ name: 'Refeição 1', time: '', options: [{ items: [] }] }] })
})
