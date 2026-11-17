import { describe, expect, test } from 'vitest'
import type { DietItem, DietLog, DietPlan, Meal, Menu } from '../types'
import {
  addExtra, currentMenu, dayFromMenu, dayStatus, daySummary, ensureDay, freeUses, isFullDay, itemKcal, itemMacros, removeItem,
  setDayFree, setDayMenu, setMealFree, skipItem, sortedMeals, swapItem, swapMeal, toggleMeal, undoSwap,
} from './day'

const it = (id: string, name: string, kcal: number, grams = 100): DietItem => ({ id, name, grams, per100: { kcal, p: 10, c: 20, f: 5 }, source: 'custom' })
const meal = (id: string, name: string, time: string, ...options: DietItem[][]): Meal => ({ id, name, time, options: options.map((items, o) => ({ id: `${id}-o${o}`, items })) })
const menuA: Menu = {
  id: 'A', name: 'Dia de treino', goalKcal: 2000, goalMacros: { p: 150, c: 200, f: 60 },
  meals: [
    meal('m1', 'Café', '07:00', [it('i1', 'Pão', 300), it('i2', 'Ovo', 150)], [it('i4', 'Iogurte', 60, 200), it('i5', 'Aveia', 380, 30)]),
    meal('m2', 'Almoço', '12:00', [it('i3', 'Arroz', 130, 200)]),
  ],
}
const menuB: Menu = { id: 'B', name: 'Descanso', meals: [meal('mb', 'Único', '08:00', [it('ib', 'Aveia', 380)])] }
const planB: DietPlan = { menus: [menuB] }
const both: DietPlan = { menus: [menuA, menuB] }
const allDone = (m: Menu) => m.meals.reduce((d, x) => toggleMeal(d, x.id), dayFromMenu(m))

describe('day', () => {
  test('dayFromMenu copia com done false, guarda o cardápio e não compartilha referência', () => {
    const d = dayFromMenu(menuA)
    expect(d).toMatchObject({ menuId: 'A', menuName: 'Dia de treino', goalKcal: 2000, goalMacros: { p: 150, c: 200, f: 60 } })
    expect(d.meals.every((m) => !m.done)).toBe(true)
    d.meals[0].items[0].grams = 1
    expect(menuA.meals[0].options[0].items[0].grams).toBe(100)
  })

  test('dayFromMenu usa a 1ª opção; swapMeal troca pelos itens da outra opção e marca swappedMeal', () => {
    let d = dayFromMenu(menuA)
    expect(d.meals[0].items.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(d.meals[0]).not.toHaveProperty('options')
    d = swapItem(d, 'm1', 'i1', it('s1', 'Tapioca', 200))
    d = skipItem(d, 'm1', 'i2', true)
    d = addExtra(d, 'm1', it('e1', 'Café', 10))
    d = swapMeal(d, 'm1', { name: 'Opção B', items: menuA.meals[0].options[1].items })
    expect(d.meals[0].swappedMeal).toBe('Opção B')
    // trocas e pulos da refeição somem; o extra (já comido) fica
    expect(d.meals[0].items.map((i) => i.id)).toEqual(['i4', 'i5', 'e1'])
    expect(d.meals[0].items.some((i) => i.skipped || i.swappedFrom)).toBe(false)
    d.meals[0].items[0].grams = 1
    expect(menuA.meals[0].options[1].items[0].grams).toBe(200)
    expect(swapMeal(d, 'zz', { name: 'x', items: [] })).toBe(d)
  })

  test('currentMenu usa lastMenuId ou o primeiro', () => {
    expect(currentMenu(both)?.id).toBe('A')
    expect(currentMenu({ ...both, lastMenuId: 'B' })?.id).toBe('B')
    expect(currentMenu({ ...both, lastMenuId: 'sumiu' })?.id).toBe('A')
    expect(currentMenu({ menus: [] })).toBeUndefined()
  })

  test('itemKcal e itemMacros usam per100 × gramas / 100', () => {
    expect(itemKcal(it('x', 'x', 130, 200))).toBe(260)
    expect(itemMacros(it('x', 'x', 130, 200))).toEqual({ p: 20, c: 40, f: 10 })
  })

  test('daySummary: refeição marcada conta, pulado não, extra conta mesmo sem marcar', () => {
    let d = dayFromMenu(menuA)
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
    expect(s.free).toBe(0)
    expect(s.dayFree).toBe(false)
  })

  test('refeição livre e dia livre não somam kcal', () => {
    let d = toggleMeal(dayFromMenu(menuA), 'm2') // 260 kcal
    d = setMealFree(addExtra(d, 'm1', it('e1', 'Doce', 500)), 'm1', true)
    expect(d.meals[0]).toMatchObject({ done: true, free: true })
    let s = daySummary(d)
    expect(s.kcal).toBe(260)
    expect(s.free).toBe(1)
    expect(s.mealsDone).toBe(2)
    expect(setMealFree(d, 'm1', false).meals[0]).toMatchObject({ done: false, free: false })
    expect(daySummary(setMealFree(d, 'm1', false)).kcal).toBe(760)

    const f = setDayFree(d, true)
    s = daySummary(f)
    expect(s.kcal).toBe(0)
    expect(s.p).toBe(0)
    expect(s.dayFree).toBe(true)
    expect(daySummary(setDayFree(f, false)).kcal).toBe(260)
  })

  test('troca substitui o item e conta como troca; trocar de novo substitui a troca', () => {
    const original = menuA.meals[0].options[0].items[0]
    let d = dayFromMenu(menuA)
    d = swapItem(d, 'm1', 'i1', it('s1', 'Tapioca', 200))
    expect(d.meals[0].items[0]).toMatchObject({ id: 's1', swappedFrom: 'Pão' })
    d = swapItem(d, 'm1', 's1', it('s2', 'Cuscuz', 100))
    expect(d.meals[0].items).toHaveLength(2)
    expect(d.meals[0].items[0]).toMatchObject({ id: 's2', swappedFrom: 'Pão' })
    expect(daySummary(d).swaps).toBe(1)
    d = undoSwap(d, 'm1', 's2', original)
    expect(d.meals[0].items[0]).toEqual(original)
  })

  test('removeItem desfaz extra; id desconhecido devolve igual', () => {
    const d = addExtra(dayFromMenu(menuA), 'm1', it('e1', 'Extra', 50))
    expect(d.meals[0].items.at(-1)?.extra).toBe(true)
    expect(removeItem(d, 'm1', 'e1').meals[0].items).toHaveLength(2)
    expect(removeItem(d, 'zz', 'e1')).toBe(d)
    expect(skipItem(d, 'm1', 'zz', true)).toEqual(d)
  })

  test('não muta a entrada', () => {
    const d = dayFromMenu(menuA)
    const snap = structuredClone(d)
    toggleMeal(d, 'm1')
    swapItem(d, 'm1', 'i1', it('s', 's', 1))
    swapMeal(d, 'm1', { name: 'x', items: [] })
    setMealFree(d, 'm1', true)
    setDayFree(d, true)
    expect(d).toEqual(snap)
  })

  test('ensureDay refaz a cópia se nada foi marcado e preserva se algo foi', () => {
    const log: DietLog = { '2026-11-18': dayFromMenu(menuA) }
    expect(ensureDay(log, planB, '2026-11-18')['2026-11-18'].meals.map((m) => m.id)).toEqual(['mb'])
    const marked: DietLog = { '2026-11-18': toggleMeal(dayFromMenu(menuA), 'm1') }
    expect(ensureDay(marked, planB, '2026-11-18')['2026-11-18'].meals.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(ensureDay({}, planB, '2026-11-18')['2026-11-18'].meals[0].id).toBe('mb')
    expect(ensureDay({}, { ...both, lastMenuId: 'B' }, 'd').d.menuId).toBe('B')
    expect(ensureDay(log, { menus: [] }, 'd')).toBe(log)
  })

  test('livre e troca de refeição também contam como tocado', () => {
    const day = dayFromMenu(menuA)
    for (const d of [setDayFree(day, true), setMealFree(day, 'm2', true), swapMeal(day, 'm1', { name: 'B', items: [] })])
      expect(ensureDay({ d }, planB, 'd').d.menuId).toBe('A')
  })

  test('extra adicionado sem marcar nada é preservado ao trocar o cardápio', () => {
    const log: DietLog = { d: addExtra(dayFromMenu(menuA), 'm1', it('e1', 'Extra', 50)) }
    expect(ensureDay(log, planB, 'd').d.meals.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  test('editar o plano não muda dias passados', () => {
    const log: DietLog = { '2026-11-17': dayFromMenu(menuA) }
    const out = ensureDay(log, planB, '2026-11-18')
    expect(out['2026-11-17']).toEqual(log['2026-11-17'])
    expect(out['2026-11-18'].meals[0].id).toBe('mb')
  })

  test('setDayMenu refaz a cópia com o cardápio escolhido', () => {
    const log: DietLog = { '2026-11-16': dayFromMenu(menuA), '2026-11-17': toggleMeal(dayFromMenu(menuA), 'm1') }
    const out = setDayMenu(log, both, '2026-11-17', 'B')
    expect(out['2026-11-17']).toEqual(dayFromMenu(menuB))
    expect(out['2026-11-16']).toBe(log['2026-11-16'])
    expect(setDayMenu({}, both, 'd', 'A').d.menuName).toBe('Dia de treino')
    expect(setDayMenu(log, both, '2026-11-17', 'sumiu')).toBe(log)
  })

  test('isFullDay exige ≥ 1 refeição, todas feitas, nenhum extra e nada livre (troca e pulo valem)', () => {
    expect(isFullDay({ menuId: 'A', menuName: 'A', meals: [] })).toBe(false)
    expect(isFullDay(undefined)).toBe(false)
    const d = allDone(menuA)
    expect(isFullDay(d)).toBe(true)
    expect(isFullDay(skipItem(swapItem(d, 'm1', 'i1', it('s', 's', 1)), 'm1', 'i2', true))).toBe(true)
    expect(isFullDay(addExtra(d, 'm1', it('e', 'e', 1)))).toBe(false)
    expect(isFullDay(setMealFree(d, 'm1', true))).toBe(false)
    expect(isFullDay(setDayFree(d, true))).toBe(false)
  })

  test('freeUses conta os livres da semana antes da data (domingo a sábado)', () => {
    const twoFree = setMealFree(setMealFree(dayFromMenu(menuA), 'm1', true), 'm2', true)
    const log: DietLog = {
      '2026-11-14': setDayFree(dayFromMenu(menuA), true), // sábado da semana anterior
      '2026-11-15': twoFree, // domingo: 2 refeições livres = 2 usos
      '2026-11-16': setDayFree(twoFree, true), // segunda: dia livre = 1 uso, mesmo com refeições livres
      '2026-11-17': allDone(menuA),
      '2026-11-20': setDayFree(dayFromMenu(menuA), true),
    }
    expect(freeUses(log, '2026-11-15')).toBe(0)
    expect(freeUses(log, '2026-11-16')).toBe(2)
    expect(freeUses(log, '2026-11-18')).toBe(3)
    expect(freeUses(log, '2026-11-21')).toBe(4)
    expect(freeUses(log, '2026-11-22')).toBe(0)
    expect(freeUses({}, '2026-11-18')).toBe(0)
  })

  test('dayStatus: 1º livre da semana não estraga o dia; o 2º sim', () => {
    const freeMealDay = setMealFree(allDone(menuA), 'm1', true)
    const log: DietLog = {
      '2026-11-15': freeMealDay, // dom: refeição livre + resto feito
      '2026-11-16': allDone(menuA),
      '2026-11-17': setDayFree(dayFromMenu(menuA), true), // ter: dia livre, 2º uso
      '2026-11-18': freeMealDay, // qua: refeição livre, 3º uso
      '2026-11-19': toggleMeal(dayFromMenu(menuA), 'm1'), // qui: incompleto
      '2026-11-22': setDayFree(dayFromMenu(menuA), true), // dom seguinte: 1º uso da semana
      '2026-11-23': setMealFree(setMealFree(allDone(menuA), 'm1', true), 'm2', true), // seg: 2 livres no mesmo dia
    }
    expect(dayStatus(log, '2026-11-15')).toBe('full')
    expect(dayStatus(log, '2026-11-16')).toBe('full')
    expect(dayStatus(log, '2026-11-17')).toBe('off')
    expect(dayStatus(log, '2026-11-18')).toBe('off')
    expect(dayStatus(log, '2026-11-19')).toBe('off')
    expect(dayStatus(log, '2026-11-20')).toBe('none')
    expect(dayStatus(log, '2026-11-22')).toBe('free-ok')
    expect(dayStatus({ '2026-11-23': log['2026-11-23'] }, '2026-11-23')).toBe('off')
    expect(dayStatus({ '2026-11-23': addExtra(freeMealDay, 'm2', it('e', 'e', 1)) }, '2026-11-23')).toBe('off')
  })

  test('sortedMeals ordena por horário e mantém empate na ordem original', () => {
    const ms = [{ n: 'a', time: '12:00' }, { n: 'b', time: '07:00' }, { n: 'c', time: '12:00' }]
    expect(sortedMeals(ms).map((m) => m.n)).toEqual(['b', 'a', 'c'])
  })
})
