import { readFileSync } from 'node:fs'
import glossary from '../data/glossary.pt.json' with { type: 'json' }
import { buildCatalog, makeBatches, type Upstream } from './build-catalog.ts'

const up: Upstream[] = [{ id: 'X', name: 'Barbell Curl', equipment: 'barbell', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms', 'biceps'], instructions: ['a', 'b'], images: ['X/0.jpg', 'X/1.jpg'] }]

test('traduz pelo glossário e monta Exercise', () => {
  expect(buildCatalog(up, glossary, { X: { name: 'Rosca direta', instructions: ['1', '2'] } })).toEqual([
    { id: 'X', name: 'Rosca direta', muscles: ['bíceps', 'antebraços'], equipment: 'barra', instructions: ['1', '2'], images: ['X/0.jpg', 'X/1.jpg'] },
  ])
})
test('falha se faltar tradução, se os passos diferirem ou se o nome vier vazio', () => {
  expect(() => buildCatalog(up, glossary, {})).toThrow(/X/)
  expect(() => buildCatalog(up, glossary, { X: { name: 'R', instructions: ['1'] } })).toThrow(/passos/)
  expect(() => buildCatalog(up, glossary, { X: { name: ' ', instructions: ['1', '2'] } })).toThrow()
})
test('equipment null vira "nenhum"', () => {
  expect(buildCatalog([{ ...up[0], equipment: null }], glossary, { X: { name: 'R', instructions: ['1', '2'] } })[0].equipment).toBe('nenhum')
})
test('glossário cobre todos os valores do upstream real', () => {
  const real: Upstream[] = JSON.parse(readFileSync('data/exercises.upstream.json', 'utf8'))
  for (const x of real) {
    for (const m of [...x.primaryMuscles, ...x.secondaryMuscles]) expect(glossary.muscles[m as keyof typeof glossary.muscles], m).toBeTruthy()
    expect(glossary.equipment[String(x.equipment) as keyof typeof glossary.equipment], String(x.equipment)).toBeTruthy()
  }
})
test('makeBatches: ordem por code unit, lotes de 50, sem perda', () => {
  const ids = Array.from({ length: 120 }, (_, i) => `id${String(i).padStart(3, '0')}`).reverse()
  const b = makeBatches(ids)
  expect(b.map(x => x.length)).toEqual([50, 50, 20])
  expect(b.flat()).toEqual([...ids].sort())
})
