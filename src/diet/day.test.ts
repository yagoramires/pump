import { describe, expect, test } from 'vitest'
import type { DietItem, DietLog, DietPlan, Meal, Menu } from './types'
import {
  addExtra, chooseOption, countsForAverage, currentMealId, dayFromMenu, dayOf, dayStatus, daySummary, freeCount, mealOptions, recentFoods, removeItem, resetDay,
  setMealFree, skipItem, swapItem, swapMeal, toggleDayFree, toggleMeal, touched, undoSwap, updateDay,
} from './day'
import { countInWeekBefore } from '@/lib/date'

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
    d = swapItem(d, 'm1', 'i1', it('s1', 'Tapioca', 200))
    d = skipItem(d, 'm1', 'i2', true)
    d = addExtra(d, 'm1', it('e1', 'Café', 10))
    d = swapMeal(d, 'm1', { name: 'Opção B', items: menuA.meals[0].options[1].items })
    expect(d.meals[0].swappedMeal).toBe('Opção B')
    expect(d.meals[0].items.map((i) => i.id)).toEqual(['i4', 'i5', 'e1'])
    expect(d.meals[0].items.some((i) => i.skipped || i.swappedFrom)).toBe(false)
    d.meals[0].items[0].grams = 1
    expect(menuA.meals[0].options[1].items[0].grams).toBe(200)
    expect(swapMeal(d, 'zz', { name: 'x', items: [] })).toBe(d)
  })

  test('chooseOption troca os itens, guarda o optionId, mantém extras e limpa trocas', () => {
    const [a, b] = menuA.meals[0].options
    let d = dayFromMenu(menuA)
    d = addExtra(d, 'm1', it('e1', 'Café', 10))
    d = swapItem(d, 'm1', 'i1', it('s1', 'Tapioca', 200))
    const r = chooseOption(d, 'm1', b)
    expect(r.meals[0].items.map((i) => i.id)).toEqual(['i4', 'i5', 'e1'])
    expect(r.meals[0].optionId).toBe(b.id)
    expect(r.meals[0].items.some((i) => i.swappedFrom || i.skipped)).toBe(false)
    expect(r.meals[0].swappedMeal).toBeUndefined()
    expect(touched(r)).toBe(true)
    expect(chooseOption(d, 'zz', a)).toBe(d)
  })

  test('chooseOption com a mesma opção não muda nada', () => {
    const [, b] = menuA.meals[0].options
    const r = chooseOption(dayFromMenu(menuA), 'm1', b)
    expect(chooseOption(r, 'm1', b)).toBe(r)
  })

  test('swapMeal limpa optionId e chooseOption depois volta às opções', () => {
    const [a, b] = menuA.meals[0].options
    let d = chooseOption(dayFromMenu(menuA), 'm1', b)
    d = swapMeal(d, 'm1', { name: 'Outra', items: [it('x', 'X', 1)] })
    expect(d.meals[0].optionId).toBeUndefined()
    d = chooseOption(d, 'm1', a)
    expect(d.meals[0]).toMatchObject({ optionId: a.id })
    expect(d.meals[0].swappedMeal).toBeUndefined()
    expect(d.meals[0].items.map((i) => i.id)).toEqual(['i1', 'i2'])
  })

  test('currentMealId: primeira não feita já no horário; senão a próxima; senão nenhuma', () => {
    const ms = [meal('a', 'A', '07:00', [it('x', 'x', 1)]), meal('c', 'C', '12:30', [it('x', 'x', 1)]), meal('b', 'B', '10:00', [it('x', 'x', 1)])]
    let d = toggleMeal(dayFromMenu({ id: 'M', name: 'M', meals: ms }), 'a')
    const at = (h: number, m: number) => new Date(2026, 10, 18, h, m)
    expect(currentMealId(d.meals, at(11, 0))).toBe('b')
    expect(currentMealId(d.meals, at(9, 0))).toBe('b')
    d = toggleMeal(d, 'b')
    expect(currentMealId(d.meals, at(11, 0))).toBe('c')
    d = setMealFree(d, 'c', true)
    expect(currentMealId(d.meals, at(11, 0))).toBeUndefined()
  })

  test('toggleMeal: livre volta a nem livre nem feita; senão inverte feita', () => {
    const free = setMealFree(dayFromMenu(menuA), 'm1', true)
    expect(toggleMeal(free, 'm1').meals[0]).toMatchObject({ free: false, done: false })
    const done = toggleMeal(dayFromMenu(menuA), 'm1')
    expect(done.meals[0]).toMatchObject({ done: true })
    expect(toggleMeal(done, 'm1').meals[0].done).toBe(false)
  })

  test('mealOptions: opções do cardápio do dia, a escolhida e se o toggle aparece', () => {
    const d = chooseOption(dayFromMenu(menuA), 'm1', menuA.meals[0].options[1])
    expect(mealOptions(both, d, 'm1')).toMatchObject({ index: 1, canToggle: true })
    expect(mealOptions(both, d, 'm2')).toMatchObject({ index: 0, canToggle: false })
    expect(mealOptions(both, swapMeal(d, 'm1', { name: 'x', items: [] }), 'm1').canToggle).toBe(false)
    expect(mealOptions(planB, d, 'm1')).toEqual({ options: [], index: 0, canToggle: false })
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

    const f = toggleDayFree(d)
    s = daySummary(f)
    expect(s.kcal).toBe(0)
    expect(s.p).toBe(0)
    expect(s.dayFree).toBe(true)
    expect(daySummary(toggleDayFree(f)).kcal).toBe(260)
  })

  test('countsForAverage: só com refeição do plano feita; extra sozinho, refeição livre ou dia livre não entram', () => {
    const d = dayFromMenu(menuA)
    expect(countsForAverage(d)).toBe(false)
    const extraOnly = addExtra(d, 'm1', it('e1', 'Doce', 500))
    expect(daySummary(extraOnly).kcal).toBe(500)
    expect(countsForAverage(extraOnly)).toBe(false)
    expect(countsForAverage(setMealFree(d, 'm1', true))).toBe(false)
    expect(countsForAverage(toggleMeal(d, 'm1'))).toBe(true)
    expect(countsForAverage(toggleDayFree(toggleMeal(d, 'm1')))).toBe(false)
  })

  test('recentFoods: um por alimento (foodKey), criados primeiro, só os últimos 14 dias', () => {
    const day = (items: DietItem[]) => ({ menuId: 'A', menuName: 'A', meals: [{ id: 'm', name: 'm', time: '12:00', done: true, items }] })
    const out = recentFoods({ menus: [] }, { '2026-11-17': day([it('a', 'Bolo da vó', 1), it('b', 'Feijão', 1)]), '2026-11-01': day([it('c', 'Velho', 1)]) }, [it('d', 'Bolo, da vó', 1)], '2026-11-18')
    expect(out.map((f) => f.name)).toEqual(['Bolo, da vó', 'Feijão'])
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
    expect(d.meals[0].items[0].original).toEqual(original)
    d = undoSwap(d, 'm1', 's2')
    expect(d.meals[0].items[0]).toEqual(original)
  })

  test('desfazer troca volta o item exato, mesmo com nome repetido em outra quantidade', () => {
    const menu: Menu = { id: 'R', name: 'R', meals: [
      meal('a', 'Almoço', '12:00', [it('r1', 'Arroz', 130, 150)]),
      meal('j', 'Jantar', '19:00', [it('r2', 'Arroz', 130, 100)]),
    ] }
    let d = skipItem(dayFromMenu(menu), 'j', 'r2', true)
    d = swapItem(d, 'j', 'r2', it('s1', 'Batata', 80, 200))
    expect(d.meals[1].items[0].original).toEqual(menu.meals[1].options[0].items[0])
    d = swapItem(d, 'j', 's1', it('s2', 'Cuscuz', 110, 120))
    d = undoSwap(d, 'j', 's2')
    expect(d.meals[1].items[0]).toEqual({ id: 'r2', name: 'Arroz', grams: 100, per100: { kcal: 130, p: 10, c: 20, f: 5 }, source: 'custom' })
    expect(undoSwap(d, 'j', 'r2')).toEqual(d)
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
    expect(d).toEqual(snap)
  })

  test('dayOf: dia sem marca segue o cardápio atual; com marca, fica o salvo', () => {
    const log: DietLog = { '2026-11-18': dayFromMenu(menuA) }
    expect(dayOf(log, planB, '2026-11-18')?.meals.map((m) => m.id)).toEqual(['mb'])
    const marked: DietLog = { '2026-11-18': toggleMeal(dayFromMenu(menuA), 'm1') }
    expect(dayOf(marked, planB, '2026-11-18')).toBe(marked['2026-11-18'])
    expect(dayOf({}, { ...both, lastMenuId: 'B' }, 'd')?.menuId).toBe('B')
    expect(dayOf({}, { ...both, lastMenuId: 'sumiu' }, 'd')?.menuId).toBe('A')
    expect(dayOf(log, { menus: [] }, '2026-11-18')).toBeUndefined()
    expect(dayOf(marked, { menus: [] }, '2026-11-18')).toBe(marked['2026-11-18'])
  })

  test('livre, troca de refeição e extra também contam como tocado', () => {
    const day = dayFromMenu(menuA)
    for (const d of [{ ...day, free: true }, setMealFree(day, 'm2', true), swapMeal(day, 'm1', { name: 'B', items: [] }), addExtra(day, 'm1', it('e1', 'Extra', 50))])
      expect(dayOf({ d }, planB, 'd')?.menuId).toBe('A')
  })

  test('updateDay aplica no dia como a pessoa vê e não mexe nos outros dias', () => {
    const log: DietLog = { '2026-11-17': dayFromMenu(menuA), '2026-11-18': dayFromMenu(menuA) }
    const out = updateDay(log, planB, '2026-11-18', (d) => toggleMeal(d, 'mb'))
    expect(out['2026-11-18']).toMatchObject({ menuId: 'B', meals: [{ id: 'mb', done: true }] })
    expect(out['2026-11-17']).toBe(log['2026-11-17'])
    expect(updateDay(log, { menus: [] }, '2026-11-18', (d) => d)).toBe(log)
  })

  test('resetDay esquece só o dia pedido', () => {
    const log: DietLog = { '2026-11-16': dayFromMenu(menuA), '2026-11-17': toggleMeal(dayFromMenu(menuA), 'm1') }
    const out = resetDay(log, '2026-11-17')
    expect(out).toEqual({ '2026-11-16': log['2026-11-16'] })
    expect(dayOf(out, { ...both, lastMenuId: 'B' }, '2026-11-17')?.menuId).toBe('B')
  })

  test('countInWeekBefore(freeCount) conta os livres da semana antes da data (domingo a sábado)', () => {
    const twoFree = setMealFree(setMealFree(dayFromMenu(menuA), 'm1', true), 'm2', true)
    const log: DietLog = {
      '2026-11-14': { ...dayFromMenu(menuA), free: true }, // sábado da semana anterior
      '2026-11-15': twoFree, // domingo: 2 refeições livres = 2 usos
      '2026-11-16': { ...twoFree, free: true }, // segunda: dia livre = 1 uso, mesmo com refeições livres
      '2026-11-17': allDone(menuA),
      '2026-11-20': { ...dayFromMenu(menuA), free: true },
    }
    expect(countInWeekBefore(log, '2026-11-15', freeCount)).toBe(0)
    expect(countInWeekBefore(log, '2026-11-16', freeCount)).toBe(2)
    expect(countInWeekBefore(log, '2026-11-18', freeCount)).toBe(3)
    expect(countInWeekBefore(log, '2026-11-21', freeCount)).toBe(4)
    expect(countInWeekBefore(log, '2026-11-22', freeCount)).toBe(0)
    expect(countInWeekBefore({}, '2026-11-18', freeCount)).toBe(0)
  })

  test('dayStatus: 1º livre da semana não estraga o dia; o 2º sim', () => {
    const freeMealDay = setMealFree(allDone(menuA), 'm1', true)
    const log: DietLog = {
      '2026-11-15': freeMealDay, // dom: refeição livre + resto feito
      '2026-11-16': allDone(menuA),
      '2026-11-17': { ...dayFromMenu(menuA), free: true }, // ter: dia livre, 2º uso
      '2026-11-18': freeMealDay, // qua: refeição livre, 3º uso
      '2026-11-19': toggleMeal(dayFromMenu(menuA), 'm1'), // qui: incompleto
      '2026-11-22': { ...dayFromMenu(menuA), free: true }, // dom seguinte: 1º uso da semana
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
})
