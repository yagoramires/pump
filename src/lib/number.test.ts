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
test('formatKg separa milhar com ponto', () => {
  expect(formatKg(1240)).toBe('1.240')
  expect(formatKg(12345.5)).toBe('12.345,5')
  expect(formatKg(0.1 + 0.2)).toBe('0,3')
})
