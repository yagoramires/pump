import { expect, test } from 'vitest'
import type { DietItem } from './types'
import { asFood, hasValues, iaLabel, itemKcal, itemMacros, recentFoods } from './food'

const it = (name: string, over: Partial<DietItem> = {}): DietItem => ({ id: name, name, grams: 200, per100: { kcal: 130, p: 10, c: 20, f: 5 }, source: 'custom', ...over })

test('itemKcal e itemMacros usam per100 × gramas / 100', () => {
  expect(itemKcal(it('x'))).toBe(260)
  expect(itemMacros(it('x'))).toEqual({ p: 20, c: 40, f: 10 })
})

test('hasValues: só item da IA com kcal 0 fica "sem valores"', () => {
  const none = it('x', { source: 'ia', per100: { kcal: 0, p: 0, c: 0, f: 0 } })
  expect(hasValues(none)).toBe(false)
  expect(iaLabel(none)).toBe('sem valores')
  expect(iaLabel(it('x', { source: 'ia' }))).toBe('estimativa da IA')
  expect(hasValues(it('x', { per100: { kcal: 0, p: 0, c: 0, f: 0 } }))).toBe(true)
  expect(iaLabel(it('x'))).toBeUndefined()
})

test('asFood tira quantidade e dados do dia', () => {
  expect(asFood({ ...it('Arroz', { portion: '1 col', source: 'taco', tacoId: 3 }), extra: true } as DietItem)).toEqual({ name: 'Arroz', per100: it('x').per100, source: 'taco', tacoId: 3 })
})

test('recentFoods: um por alimento (foodKey), criados primeiro, só os últimos 14 dias', () => {
  const day = (items: DietItem[]) => ({ menuId: 'A', menuName: 'A', meals: [{ id: 'm', name: 'm', time: '12:00', done: true, items }] })
  const out = recentFoods({ menus: [] }, { '2026-11-17': day([it('Bolo da vó'), it('Feijão')]), '2026-11-01': day([it('Velho')]) }, [it('Bolo, da vó')], '2026-11-18')
  expect(out.map((f) => f.name)).toEqual(['Bolo, da vó', 'Feijão'])
})
