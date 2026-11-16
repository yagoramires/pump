import { daysBetween, formatDayLabel, todayKey, weekday } from './date'

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
