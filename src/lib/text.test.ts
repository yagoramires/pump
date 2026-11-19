import { pluralWord } from './text'
test('pluralWord', () => {
  for (const [a, b] of [['unidade', 'unidades'], ['concha', 'conchas'], ['fatia', 'fatias'], ['colher', 'colheres'], ['ovo', 'ovos'], ['pote', 'potes'], ['ovos', 'ovos'], ['nariz', 'narizes'], ['animal', 'animais'], ['item', 'itens'], ['porção', 'porções']]) expect(pluralWord(a)).toBe(b)
})
