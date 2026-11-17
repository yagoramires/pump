import { muscleColor } from './muscleColor'

test('muscleColor pelo primeiro músculo conhecido', () => {
  expect(muscleColor(['peito', 'tríceps'])).toBe('var(--c2)')
  expect(muscleColor(['dorsais'])).toBe('var(--c6)')
  expect(muscleColor(['quadríceps'])).toBe('var(--c1)')
  expect(muscleColor([])).toBe('var(--c5)')
})
