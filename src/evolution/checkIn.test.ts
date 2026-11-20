import { expect, test } from 'vitest'
import { checkInDue, weekSummary } from './checkIn'

const m = (date: string, weightKg?: number) => ({ id: date, date, weightKg })
// 2026-11-18 é quarta (3)
test('antes do dia da semana: não pendente se fez na semana passada', () => expect(checkInDue(5, [m('2026-11-13', 80)], '2026-11-18')).toBeUndefined())
test('no dia: pendente', () => expect(checkInDue(3, [m('2026-11-11', 80)], '2026-11-18')).toBe('2026-11-18'))
test('depois do dia sem registrar: pendente com a data do dia', () => expect(checkInDue(1, [m('2026-11-09', 80)], '2026-11-18')).toBe('2026-11-16'))
test('já registrou peso desde o dia: não pendente', () => expect(checkInDue(1, [m('2026-11-17', 80)], '2026-11-18')).toBeUndefined())
test('virada de semana: check-in perdido continua pendente', () => expect(checkInDue(5, [m('2026-11-06', 80)], '2026-11-18')).toBe('2026-11-13'))
test('medição só com medidas não conta', () => expect(checkInDue(3, [m('2026-11-11', 80), m('2026-11-18')], '2026-11-18')).toBe('2026-11-18'))
test('sem dia ou sem peso: nada', () => { expect(checkInDue(undefined, [m('2026-11-01', 80)], '2026-11-18')).toBeUndefined(); expect(checkInDue(3, [], '2026-11-18')).toBeUndefined() })
test('resumo da semana', () => {
  const r = weekSummary({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [{ id: 'a', date: '2026-10-28', weightKg: 83.7, waistCm: 94 }, { id: 'b', date: '2026-11-11', weightKg: 82.4, waistCm: 93 }, { id: 'c', date: '2026-11-18', weightKg: 81.6, waistCm: 92 }], [{ id: 'p', date: '2026-11-18', frente: 'x', lado: 'y', costas: 'z' }], '2026-11-18')!
  expect(r).toMatchObject({ week: 3, weight: 81.6, photos: 3 })
  expect(r.sincePrev).toBeCloseTo(-0.8)
  expect(r.sinceStart).toBeCloseTo(-2.1)
  expect(r.rows).toEqual([expect.objectContaining({ label: 'Cintura', delta: -1, good: true })])
})
test('anterior antiga: devolve a data; ruído de float não vira linha 0,0', () => {
  const r = weekSummary({ sex: 'M', heightCm: 178, dietGoal: 'perder' }, [{ id: 'a', date: '2026-08-01', weightKg: 83, waistCm: 94 }, { id: 'c', date: '2026-11-18', weightKg: 81.6, waistCm: 94 + 1e-15 }], [], '2026-11-18')!
  expect(r.prevDate).toBe('2026-08-01')
  expect(r.rows).toEqual([])
})
test('"semana passada" só com a anterior a 6–8 dias', () => {
  const at = (prev: string) => weekSummary({ sex: 'M', heightCm: 178 }, [m(prev, 82), m('2026-11-18', 81.6)], [], '2026-11-18')!.prevIsLastWeek
  expect(at('2026-11-11')).toBe(true)
  expect(at('2026-11-17')).toBe(false)
  expect(at('2026-11-09')).toBe(false)
})
