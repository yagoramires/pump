import { formatKg, parseDecimal } from './number'

test('parseDecimal aceita vírgula e recusa lixo', () => {
  expect(parseDecimal('22,5')).toBe(22.5)
  expect(parseDecimal(' 80 ')).toBe(80)
  expect(parseDecimal('22.5')).toBe(22.5)
  expect(parseDecimal('')).toBeNull()
  expect(parseDecimal('abc')).toBeNull()
  expect(parseDecimal('-3')).toBeNull()
})
test('formatKg usa vírgula e omite ,0', () => {
  expect(formatKg(42.5)).toBe('42,5')
  expect(formatKg(40)).toBe('40')
})
