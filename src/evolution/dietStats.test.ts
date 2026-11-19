import { dietDay } from '../../test/helpers'
import { dietStats, hasDiet } from './dietStats'

test('dietStats: dias contam do 1º registro de dieta ou água; sem dado a média é undefined', () => {
  const s = dietStats({ '2026-12-05': dietDay([false]) }, { '2026-12-03': { ml: 2000, goalMl: 2000 } }, '2026-11-13', '2026-12-12')
  expect(s).toEqual({ avgKcal: undefined, avgGoal: undefined, fullDays: 0, waterDays: 1, freeUses: 0, days: 10 })
  expect(dietStats({}, {}, '2026-11-13', '2026-12-12')).toMatchObject({ days: 0, waterDays: undefined })
})
test('hasDiet: cardápio ou algum dia registrado', () => {
  expect(hasDiet({ menus: [] }, {})).toBe(false)
  expect(hasDiet({ menus: [{ id: 'm', name: 'M', meals: [] }] }, {})).toBe(true)
  expect(hasDiet({ menus: [] }, { '2026-12-01': dietDay([false]) })).toBe(true)
})
