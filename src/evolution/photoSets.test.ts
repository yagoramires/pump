import { fitWithin } from './resize'
import { removeSet, setAngle } from './photoSets'

test('setAngle substitui o ângulo do mesmo dia e devolve a foto antiga', () => {
  let r = setAngle([], '2026-11-17', 'frente', 'p1')
  r = setAngle(r.sets, '2026-11-17', 'frente', 'p2')
  expect(r.replaced).toBe('p1')
  expect(r.sets).toHaveLength(1)
  expect(r.sets[0].frente).toBe('p2')
  expect(removeSet(r.sets, r.sets[0].id)).toEqual({ sets: [], photoIds: ['p2'] })
})
test('fitWithin', () => {
  expect(fitWithin(4032, 3024)).toEqual({ w: 1280, h: 960 })
  expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 })
})
