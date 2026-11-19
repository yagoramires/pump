import { label, names } from './promptRules'

test('ignora rótulos desconhecidos vindos de um backup antigo', () => {
  const labels = { valido: 'Rótulo' }
  expect(label(labels, 'constructor')).toBe('')
  expect(names(['toString', 'valido', '__proto__', {}], labels)).toBe('Rótulo')
})
