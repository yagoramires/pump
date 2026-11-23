import type { DietItem, Menu } from './types'
import { MAX_ITEMS } from './limits'
import { macroSplit, moveFood } from './dietEdit'

const item = (name: string, over: Partial<DietItem> = {}): DietItem => ({ id: name, name, grams: 100, per100: { kcal: 0, p: 0, c: 0, f: 0 }, source: 'custom', ...over })
const menuOf = (o1: string[], o2: string[]): Menu => ({
  id: 'm', name: 'Cardápio',
  meals: [
    { id: 'r1', name: 'Almoço', time: '12:00', options: [{ id: 'o1', items: o1.map((n) => item(n)) }] },
    { id: 'r2', name: 'Jantar', time: '19:00', options: [{ id: 'o2', items: o2.map((n) => item(n)) }] },
  ],
})
const names = (m: Menu, mi: number) => m.meals[mi].options[0].items.map((i) => i.name)

test('moveFood reordena dentro da opção', () => {
  expect(names(moveFood(menuOf(['a', 'b', 'c'], []), { optionId: 'o1', index: 0 }, { optionId: 'o1', index: 2 }), 0)).toEqual(['b', 'c', 'a'])
})

test('moveFood leva pra opção de outra refeição', () => {
  const m = moveFood(menuOf(['a', 'b'], ['c']), { optionId: 'o1', index: 1 }, { optionId: 'o2', index: 0 })
  expect(names(m, 0)).toEqual(['a'])
  expect(names(m, 1)).toEqual(['b', 'c'])
})

test('moveFood com índice além do fim põe no fim (soltar na aba da opção)', () => {
  expect(names(moveFood(menuOf(['a', 'b'], ['c']), { optionId: 'o1', index: 1 }, { optionId: 'o2', index: 99 }), 1)).toEqual(['c', 'b'])
})

test('moveFood não passa do limite de itens da opção de destino', () => {
  const menu = menuOf(['a'], Array.from({ length: MAX_ITEMS }, (_, i) => `x${i}`))
  expect(moveFood(menu, { optionId: 'o1', index: 0 }, { optionId: 'o2', index: 0 })).toBe(menu)
})

test('macroSplit dá gramas e kcal na ordem p, c, f', () => {
  const items = [item('a', { per100: { kcal: 0, p: 10, c: 20, f: 5 } })]
  expect(macroSplit(items)).toEqual([{ key: 'p', grams: 10, kcal: 40 }, { key: 'c', grams: 20, kcal: 80 }, { key: 'f', grams: 5, kcal: 45 }])
})
