import { isCardio } from './cardio'

test('cardio é 1 série com duração em minutos', () => {
  expect(isCardio({ sets: 1, reps: '15 min' })).toBe(true)
  expect(isCardio({ sets: 1, reps: '20-30 min' })).toBe(true)
  expect(isCardio({ sets: [null], reps: '20 minutos' })).toBe(true)
  expect(isCardio({ sets: 3, reps: '1 min' })).toBe(false) // prancha 3 × 1 min
  expect(isCardio({ sets: 1, reps: '12' })).toBe(false)
  expect(isCardio({ sets: 1, reps: '30 s' })).toBe(false)
})
