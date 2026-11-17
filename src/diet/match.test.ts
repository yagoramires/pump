import type { DietItem, TacoFood } from './types'
import { foodKey, matchFood } from './match'

// fixture com nomes reais da TACO
const T: TacoFood[] = [
  { id: 1, name: 'Arroz, integral, cozido', kcal: 124, p: 2.6, c: 25.8, f: 1 },
  { id: 2, name: 'Arroz, integral, cru', kcal: 360, p: 7.3, c: 77.5, f: 1.9 },
  { id: 3, name: 'Frango, peito, sem pele, grelhado', kcal: 159, p: 32, c: 0, f: 2.5 },
  { id: 4, name: 'Frango, peito, com pele, assado', kcal: 212, p: 33.4, c: 0, f: 7.6 },
  { id: 5, name: 'Ovo, de galinha, inteiro, cozido/10minutos', kcal: 146, p: 13.3, c: 0.6, f: 9.5 },
  { id: 7, name: 'Aveia, flocos, crua', kcal: 394, p: 13.9, c: 66.6, f: 8.5 },
  { id: 456, name: 'Leite, de vaca, desnatado, pó', kcal: 362, p: 34.7, c: 53, f: 0.9 },
]

test('foodKey: minúsculas, sem acento, pontuação vira espaço', () =>
  expect(foodKey('  Feijão,  carioca, COZIDO/10min ')).toBe('feijao carioca cozido 10min'))
test('nome igual casa (pontuação vira espaço)', () =>
  expect(matchFood('Ovo, de galinha, inteiro, cozido/10minutos', 100, undefined, T, [])).toMatchObject({ kind: 'exact', food: { id: 5 } }))
test('"cru" vs "cozido" decidido pela kcal da IA', () =>
  expect(matchFood('Arroz integral', 100, 130, T, [])).toMatchObject({ kind: 'words', food: { id: 1 } }))
test('candidato fora de 35% da kcal da IA cai pra estimativa', () =>
  expect(matchFood('Arroz integral', 100, 60, T, [])).toBeNull())
test('sem kcal da IA só casa nome igual (como na TACO real, só o leite em pó tem as palavras)', () => {
  expect(matchFood('Leite desnatado', 200, undefined, T, [])).toBeNull()
  expect(matchFood('Arroz integral', 100, undefined, T, [])).toBeNull()
  expect(matchFood('Leite desnatado', 200, 70, T, [])).toBeNull()
})
test('com kcal da IA o casamento por palavras funciona', () =>
  expect(matchFood('Peito de frango grelhado', 120, 190, T, [])).toMatchObject({ kind: 'words', food: { id: 3 } }))
test('"em" é ignorado: "Aveia em flocos" casa com o nome da TACO', () =>
  expect(matchFood('Aveia em flocos', 30, 118, T, [])).toMatchObject({ kind: 'words', food: { id: 7 } }))
test('"com pele" não casa com "sem pele"', () =>
  expect(matchFood('Frango peito com pele', 100, 212, T, [])).toMatchObject({ food: { id: 4 } }))
test('"de" é ignorado, mas o nome sem palavras úteis não casa nada', () => {
  expect(matchFood('Ovo de galinha cozido', 100, 146, T, [])).toMatchObject({ kind: 'words', food: { id: 5 } })
  expect(matchFood('de, da', 100, undefined, T, [])).toBeNull()
})
test('alimento criado casa antes da TACO', () => {
  const mine: DietItem = { id: 'c1', name: 'Arroz integral cozido', grams: 150, per100: { kcal: 110, p: 2, c: 23, f: 1 }, source: 'custom' }
  const fromTaco: DietItem = { ...mine, id: 't1', source: 'taco', tacoId: 1 }
  expect(matchFood('Arroz, integral, cozido', 100, undefined, T, [fromTaco, mine])).toEqual({ kind: 'custom', item: mine })
})
