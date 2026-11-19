import { pluralWord, singularWord } from './text'
test('pluralWord', () => {
  for (const [a, b] of [['unidade', 'unidades'], ['concha', 'conchas'], ['fatia', 'fatias'], ['colher', 'colheres'], ['ovo', 'ovos'], ['pote', 'potes'], ['ovos', 'ovos'], ['nariz', 'narizes'], ['animal', 'animais'], ['item', 'itens'], ['porção', 'porções'], ['pão', 'pães'], ['mão', 'mãos'], ['cão', 'cães'], ['alemão', 'alemães']]) expect(pluralWord(a)).toBe(b)
})

test('pluralWord: -l e capitalização', () => {
  for (const [a, b] of [['barril', 'barris'], ['papel', 'papéis'], ['anzol', 'anzóis'], ['azul', 'azuis'], ['Papel', 'Papéis'], ['PAPEL', 'PAPÉIS'], ['Pão', 'Pães']]) expect(pluralWord(a)).toBe(b)
})
test('singularWord inverte pluralWord', () => {
  for (const w of ['unidade', 'pote', 'pão', 'colher', 'ovo', 'barril', 'papel', 'anzol', 'azul', 'item', 'porção', 'animal', 'nariz', 'mão', 'concha']) expect(singularWord(pluralWord(w))).toBe(w)
  expect(singularWord('ovo')).toBe('ovo')
})
