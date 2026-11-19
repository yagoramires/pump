import { expect, test } from 'vitest'
import type { DietItem } from './types'
import { asFood, foodKey, hasValues, itemKcal, macrosOf } from './food'

const it = (name: string, over: Partial<DietItem> = {}): DietItem => ({ id: name, name, grams: 200, per100: { kcal: 130, p: 10, c: 20, f: 5 }, source: 'custom', ...over })

test('itemKcal e macrosOf usam per100 × gramas / 100; macrosOf soma os itens', () => {
  expect(itemKcal(it('x'))).toBe(260)
  expect(macrosOf([it('x')])).toEqual({ p: 20, c: 40, f: 10 })
  expect(macrosOf([it('x'), it('y', { grams: 100 })])).toEqual({ p: 30, c: 60, f: 15 })
  expect(macrosOf([])).toEqual({ p: 0, c: 0, f: 0 })
})

test('foodKey: sem acento, caixa e pontuação; letras não latinas ficam', () => {
  expect(foodKey(' Arroz,  cozido/Integral ')).toBe('arroz cozido integral')
  expect(foodKey('Pão de queijo')).toBe(foodKey('pao de QUEIJO'))
  expect(foodKey('豆腐')).toBe('豆腐')
  expect(foodKey('豆腐')).not.toBe(foodKey('味噌'))
})

test('hasValues: só item da IA com kcal 0 fica "sem valores"', () => {
  expect(hasValues(it('x', { source: 'ia', per100: { kcal: 0, p: 0, c: 0, f: 0 } }))).toBe(false)
  expect(hasValues(it('x', { source: 'ia' }))).toBe(true)
  expect(hasValues(it('x', { per100: { kcal: 0, p: 0, c: 0, f: 0 } }))).toBe(true)
})

test('asFood tira quantidade e dados do dia', () => {
  expect(asFood({ ...it('Arroz', { portion: '1 col', source: 'taco', tacoId: 3 }), extra: true } as DietItem)).toEqual({ name: 'Arroz', per100: it('x').per100, source: 'taco', tacoId: 3 })
})
