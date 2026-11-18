import { expect, test } from 'vitest'
import type { Settings } from '@/schema'
import { checkInDue, weekSummary } from './checkIn'

const s = (checkInDay?: number) => ({ lastTab: 'evolucao', onboardingDone: true, checkInDay }) as Settings
const m = (date: string, weightKg?: number) => ({ id: date, date, weightKg })
// 2026-11-18 é quarta (3)
test('antes do dia da semana: não pendente se fez na semana passada', () => expect(checkInDue(s(5), [m('2026-11-13', 80)], '2026-11-18')).toBeUndefined())
test('no dia: pendente', () => expect(checkInDue(s(3), [m('2026-11-11', 80)], '2026-11-18')).toBe('2026-11-18'))
test('depois do dia sem registrar: pendente com a data do dia', () => expect(checkInDue(s(1), [m('2026-11-09', 80)], '2026-11-18')).toBe('2026-11-16'))
test('já registrou peso desde o dia: não pendente', () => expect(checkInDue(s(1), [m('2026-11-17', 80)], '2026-11-18')).toBeUndefined())
test('virada de semana: check-in perdido continua pendente', () => expect(checkInDue(s(5), [m('2026-11-06', 80)], '2026-11-18')).toBe('2026-11-13'))
test('medição só com medidas não conta', () => expect(checkInDue(s(3), [m('2026-11-11', 80), m('2026-11-18')], '2026-11-18')).toBe('2026-11-18'))
test('sem dia ou sem peso: nada', () => { expect(checkInDue(s(), [m('2026-11-01', 80)], '2026-11-18')).toBeUndefined(); expect(checkInDue(s(3), [], '2026-11-18')).toBeUndefined() })
test('resumo da semana', () => {
  const r = weekSummary({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [{ id: 'a', date: '2026-10-28', weightKg: 83.7, waistCm: 94 }, { id: 'b', date: '2026-11-11', weightKg: 82.4, waistCm: 93 }, { id: 'c', date: '2026-11-18', weightKg: 81.6, waistCm: 92 }], [{ id: 'p', date: '2026-11-18', frente: 'x', lado: 'y', costas: 'z' }], '2026-11-18')!
  expect(r).toMatchObject({ week: 3, weight: 81.6, photos: 3 })
  expect(r.sincePrev).toBeCloseTo(-0.8)
  expect(r.sinceStart).toBeCloseTo(-2.1)
  expect(r.rows).toEqual([expect.objectContaining({ label: 'Cintura', delta: -1, good: true })])
})
