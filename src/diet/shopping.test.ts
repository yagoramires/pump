import { countText, formatAmount, shoppingList, shoppingText } from './shopping'
import type { DietItem, DietPlan, Meal } from './types'

const item = (name: string, grams: number, extra: Partial<DietItem> = {}): DietItem => ({ id: name + grams, name, grams, per100: { kcal: 1, p: 1, c: 1, f: 1 }, source: 'custom', ...extra })
const meal = (...options: DietItem[][]): Meal => ({ id: 'm', name: 'M', time: '08:00', options: options.map((items, i) => ({ id: `o${i}`, items })) })
const plan = (...menus: Meal[][]): DietPlan => ({ menus: menus.map((meals, i) => ({ id: `m${i}`, name: `M${i}`, meals })) })

describe('shoppingList', () => {
  it('divide por opções e cardápios', () => {
    const p = plan([meal([item('Arroz', 200)], [item('Pão', 100)])], [meal([item('Arroz', 100)])])
    // Arroz: 200*30/(2*2) + 100*30/(1*2) = 1500 + 1500
    expect(shoppingList(p, 30).find((i) => i.name === 'Arroz')?.grams).toBe(3000)
    expect(shoppingList(p, 30).find((i) => i.name === 'Pão')?.grams).toBe(750)
  })
  it('soma o mesmo alimento entre refeições, por tacoId ou nome normalizado', () => {
    const p = plan([meal([item('Arroz', 100, { tacoId: 1 })]), meal([item('Arroz cozido', 50, { tacoId: 1 })]), meal([item('Ovo', 10)]), meal([item('ovó', 10)])])
    const l = shoppingList(p, 7)
    expect(l).toHaveLength(2)
    expect(l.find((i) => i.name === 'Arroz')?.grams).toBe(1050)
    expect(l.find((i) => i.name === 'Ovo')?.grams).toBe(140)
  })
  it('30 dias contra 7', () => {
    const p = plan([meal([item('Arroz', 100)])])
    expect(shoppingList(p, 7)[0].grams).toBe(700)
    expect(shoppingList(p, 30)[0].grams).toBe(3000)
  })
  it('conta só quando todas as ocorrências têm a mesma unidade', () => {
    const ok = plan([meal([item('Ovo', 100, { portion: '2 ovos' })]), meal([item('Ovo', 50, { portion: '1 ovo' })])])
    expect(shoppingList(ok, 7)[0].count).toEqual({ n: 21, unit: 'ovo' })
    const mixed = plan([meal([item('Ovo', 100, { portion: '2 ovos' })]), meal([item('Ovo', 50)])])
    expect(shoppingList(mixed, 7)[0].count).toBeUndefined()
    const other = plan([meal([item('Ovo', 100, { portion: '2 ovos' })]), meal([item('Ovo', 50, { portion: '1 colher' })])])
    expect(shoppingList(other, 7)[0].count).toBeUndefined()
  })
  it('arredonda a contagem pra cima', () => {
    const p = plan([meal([item('Pão', 50, { portion: '1 fatia' })], [item('X', 1)])])
    expect(shoppingList(p, 7).find((i) => i.name === 'Pão')?.count).toEqual({ n: 4, unit: 'fatia' })
  })
  it('ordena em pt-BR', () => {
    const p = plan([meal([item('Banana', 1), item('Água de coco', 1), item('Abacate', 1)])])
    expect(shoppingList(p, 7).map((i) => i.name)).toEqual(['Abacate', 'Água de coco', 'Banana'])
  })
})

describe('formatAmount', () => {
  it('kg e g', () => {
    expect(formatAmount(4200)).toBe('4,2 kg')
    expect(formatAmount(350.4)).toBe('350 g')
    expect(formatAmount(999.6)).toBe('1 kg')
  })
})

it('shoppingText', () => {
  expect(shoppingText([{ key: 'a', name: 'Arroz', grams: 4200 }, { key: 'o', name: 'Ovo', grams: 700, count: { n: 14, unit: 'ovos' } }])).toBe('• Arroz — 4,2 kg\n• Ovo — 700 g (≈ 14 ovos)')
})

it('countText pluraliza só com n > 1', () => {
  expect(countText({ n: 45, unit: 'unidade' })).toBe('≈ 45 unidades')
  expect(countText({ n: 14, unit: 'ovos' })).toBe('≈ 14 ovos')
  expect(countText({ n: 1, unit: 'fatia' })).toBe('≈ 1 fatia')
})

it('countText pluraliza só com n > 1', () => {
  expect(countText({ n: 45, unit: 'unidade' })).toBe('≈ 45 unidades')
  expect(countText({ n: 14, unit: 'ovos' })).toBe('≈ 14 ovos')
  expect(countText({ n: 1, unit: 'fatia' })).toBe('≈ 1 fatia')
})

describe('unidades', () => {
  const one = (...portions: (string | undefined)[]) => shoppingList(plan(portions.map((po) => meal([item('X', 10, { portion: po })]))), 7)[0]
  it('singular e plural da mesma unidade somam', () => {
    expect(one('1 unidade', '2 unidades')?.count).toEqual({ n: 21, unit: 'unidade' })
    expect(one('1 pote', '2 potes')?.count).toEqual({ n: 21, unit: 'pote' })
    expect(one('1 pão', '2 pães')?.count).toEqual({ n: 21, unit: 'pão' })
    expect(one('1 colher', '2 colheres')?.count?.n).toBe(21)
  })
  it('gramas e ml não são contáveis', () => {
    expect(one('100 g')?.count).toBeUndefined()
    expect(one('200 ml')?.count).toBeUndefined()
    expect(one('1 litro')?.count).toBeUndefined()
  })
  it('a unidade é a expressão toda', () => {
    expect(one('3 colheres de sopa', '1 colher de chá')?.count).toBeUndefined()
    expect(one('3 colheres de sopa', '1 colher de sopa')?.count).toEqual({ n: 28, unit: 'colher de sopa' })
  })
  it('countText: singular com 1, plural da expressão, sigla intacta', () => {
    expect(countText({ n: 1, unit: 'unidade' })).toBe('≈ 1 unidade')
    expect(countText({ n: 3, unit: 'colher de sopa' })).toBe('≈ 3 colheres de sopa')
    expect(countText({ n: 2, unit: 'un' })).toBe('≈ 2 un')
    expect(countText({ n: 2, unit: 'col' })).toBe('≈ 2 col')
    expect(countText({ n: 2, unit: 'pão' })).toBe('≈ 2 pães')
  })
})
