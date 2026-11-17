import { describe, expect, test } from 'vitest'
import type { DietItem, DietLog, DietPlan } from '../types'
import { addExtra, dayFromPlan, daySummary, ensureDay, isFullDay, itemKcal, itemMacros, removeItem, skipItem, sortedMeals, swapItem, toggleMeal, undoSwap } from './day'

const it = (id: string, name: string, kcal: number, grams = 100): DietItem => ({ id, name, grams, per100: { kcal, p: 10, c: 20, f: 5 }, source: 'custom' })
const planA: DietPlan = {
  goalKcal: 2000,
  meals: [
    { id: 'm1', name: 'Café', time: '07:00', items: [it('i1', 'Pão', 300), it('i2', 'Ovo', 150)] },
    { id: 'm2', name: 'Almoço', time: '12:00', items: [it('i3', 'Arroz', 130, 200)] },
  ],
}
const planB: DietPlan = { meals: [{ id: 'mb', name: 'Único', time: '08:00', items: [it('ib', 'Aveia', 380)] }] }

describe('day', () => {
  test('dayFromPlan copia com done false e não compartilha referência', () => {
    const d = dayFromPlan(planA)
    expect(d.goalKcal).toBe(2000)
    expect(d.meals.every((m) => !m.done)).toBe(true)
    d.meals[0].items[0].grams = 1
    expect(planA.meals[0].items[0].grams).toBe(100)
  })

  test('itemKcal e itemMacros usam per100 × gramas / 100', () => {
    expect(itemKcal(it('x', 'x', 130, 200))).toBe(260)
    expect(itemMacros(it('x', 'x', 130, 200))).toEqual({ p: 20, c: 40, f: 10 })
  })

  test('daySummary: refeição marcada conta, pulado não, extra conta mesmo sem marcar', () => {
    let d = dayFromPlan(planA)
    d = toggleMeal(d, 'm1')
    d = skipItem(d, 'm1', 'i1', true)
    d = addExtra(d, 'm2', it('e1', 'Extra', 200))
    const s = daySummary(d)
    expect(s.kcal).toBe(350)
    expect(s.mealsDone).toBe(1)
    expect(s.mealsTotal).toBe(2)
    expect(s.extras).toBe(1)
    expect(s.skipped).toBe(1)
    expect(s.p).toBe(20)
  })

  test('troca substitui o item e conta como troca; trocar de novo substitui a troca', () => {
    let d = dayFromPlan(planA)
    d = swapItem(d, 'm1', 'i1', it('s1', 'Tapioca', 200))
    expect(d.meals[0].items[0]).toMatchObject({ id: 's1', swappedFrom: 'Pão' })
    d = swapItem(d, 'm1', 's1', it('s2', 'Cuscuz', 100))
    expect(d.meals[0].items).toHaveLength(2)
    expect(d.meals[0].items[0]).toMatchObject({ id: 's2', swappedFrom: 'Pão' })
    expect(daySummary(d).swaps).toBe(1)
    d = undoSwap(d, 'm1', 's2', planA.meals[0].items[0])
    expect(d.meals[0].items[0]).toEqual(planA.meals[0].items[0])
  })

  test('removeItem desfaz extra; id desconhecido devolve igual', () => {
    let d = addExtra(dayFromPlan(planA), 'm1', it('e1', 'Extra', 50))
    expect(d.meals[0].items.at(-1)?.extra).toBe(true)
    expect(removeItem(d, 'm1', 'e1').meals[0].items).toHaveLength(2)
    expect(removeItem(d, 'zz', 'e1')).toBe(d)
    expect(skipItem(d, 'm1', 'zz', true)).toEqual(d)
  })

  test('não muta a entrada', () => {
    const d = dayFromPlan(planA)
    const snap = structuredClone(d)
    toggleMeal(d, 'm1')
    swapItem(d, 'm1', 'i1', it('s', 's', 1))
    expect(d).toEqual(snap)
  })

  test('ensureDay refaz a cópia se nada foi marcado e preserva se algo foi', () => {
    const log: DietLog = { '2026-11-18': dayFromPlan(planA) }
    expect(ensureDay(log, planB, '2026-11-18')['2026-11-18'].meals.map((m) => m.id)).toEqual(['mb'])
    const marked: DietLog = { '2026-11-18': toggleMeal(dayFromPlan(planA), 'm1') }
    expect(ensureDay(marked, planB, '2026-11-18')['2026-11-18'].meals.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(ensureDay({}, planB, '2026-11-18')['2026-11-18'].meals[0].id).toBe('mb')
  })

  test('extra adicionado sem marcar nada é preservado ao trocar o cardápio', () => {
    const log: DietLog = { d: addExtra(dayFromPlan(planA), 'm1', it('e1', 'Extra', 50)) }
    expect(ensureDay(log, planB, 'd').d.meals.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  test('editar o plano não muda dias passados', () => {
    const log: DietLog = { '2026-11-17': dayFromPlan(planA) }
    const out = ensureDay(log, planB, '2026-11-18')
    expect(out['2026-11-17']).toEqual(log['2026-11-17'])
    expect(out['2026-11-18'].meals[0].id).toBe('mb')
  })

  test('isFullDay exige ≥ 1 refeição, todas feitas e nenhum extra (troca e pulo valem)', () => {
    expect(isFullDay({ meals: [] })).toBe(false)
    expect(isFullDay(undefined)).toBe(false)
    let d = dayFromPlan(planA)
    d = toggleMeal(toggleMeal(d, 'm1'), 'm2')
    expect(isFullDay(d)).toBe(true)
    expect(isFullDay(skipItem(swapItem(d, 'm1', 'i1', it('s', 's', 1)), 'm1', 'i2', true))).toBe(true)
    expect(isFullDay(addExtra(d, 'm1', it('e', 'e', 1)))).toBe(false)
  })

  test('sortedMeals ordena por horário e mantém empate na ordem original', () => {
    const ms = [{ n: 'a', time: '12:00' }, { n: 'b', time: '07:00' }, { n: 'c', time: '12:00' }]
    expect(sortedMeals(ms).map((m) => m.n)).toEqual(['b', 'a', 'c'])
  })
})
