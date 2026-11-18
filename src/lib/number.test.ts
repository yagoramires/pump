import { formatKg, formatSigned, parseDecimal, parseInRange, plural } from './number'

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
test('plural usa singular só para 1', () => {
  expect(plural(1, 'treino', 'treinos')).toBe('1 treino')
  expect(plural(0, 'treino', 'treinos')).toBe('0 treinos')
  expect(plural(2, 'treino', 'treinos')).toBe('2 treinos')
})
test('formatSigned põe sinal e aceita outro menos', () => {
  expect(formatSigned(-1.5)).toBe('−1,5')
  expect(formatSigned(2)).toBe('+2')
  expect(formatSigned(0)).toBe('0')
  expect(formatSigned(-1, '–')).toBe('–1')
})
test('parseInRange recusa fora da faixa', () => {
  expect(parseInRange('500', 0, 500)).toBe(500)
  expect(parseInRange('500,5', 0, 500)).toBeNull()
  expect(parseInRange('x', 0, 500)).toBeNull()
})
