import { addDays, countInWeekBefore, daysBetween, eachDay, formatDayLabel, formatDayMonth, hhmm, todayKey, weekStart, weekday } from './date'

test('todayKey usa o dia local mesmo depois das 21h', () => {
  expect(todayKey(new Date(2026, 10, 16, 22, 30))).toBe('2026-11-16')
  expect(todayKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
})
test('weekday, daysBetween e formatDayLabel', () => {
  expect(weekday('2026-11-16')).toBe(1)
  expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14)
  expect(formatDayLabel('2026-11-16')).toBe('SEG, 16 NOV')
  expect(formatDayLabel('2026-11-21')).toBe('SÁB, 21 NOV')
})
test('weekStart volta ao domingo e formatDayMonth abrevia o mês', () => {
  expect(weekStart('2026-11-15')).toBe('2026-11-15')
  expect(weekStart('2026-11-21')).toBe('2026-11-15')
  expect(weekStart('2026-11-01')).toBe('2026-11-01')
  expect(weekStart('2026-10-31')).toBe('2026-10-25')
  expect(formatDayMonth('2026-11-16')).toBe('16 nov')
})
test('addDays e eachDay atravessam mês e horário de verão', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  // virada do horário de verão (EUA 8/3/2026, BR antigo 4/11/2018): o dia nunca é pulado nem repetido
  expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
  expect(addDays('2018-11-03', 1)).toBe('2018-11-04')
  expect(addDays('2018-11-04', 1)).toBe('2018-11-05')
  expect(eachDay('2018-11-03', '2018-11-06')).toEqual(['2018-11-03', '2018-11-04', '2018-11-05'])
  expect(eachDay('2026-11-05', '2026-11-05')).toEqual([])
})
test('countInWeekBefore soma só domingo..véspera da mesma semana', () => {
  const log = { '2026-11-14': 5, '2026-11-15': 1, '2026-11-17': 2, '2026-11-18': 10, '2026-11-22': 7 }
  const n = (d: string) => countInWeekBefore(log, d, (v) => v)
  expect(n('2026-11-15')).toBe(0)
  expect(n('2026-11-18')).toBe(3)
  expect(n('2026-11-21')).toBe(13)
  expect(n('2026-11-22')).toBe(0)
})
test('hhmm completa com zero', () => {
  expect(hhmm(new Date(2026, 0, 1, 7, 5))).toBe('07:05')
})
