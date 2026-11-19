import { groupExercises, isCardio, repsNumber, repsPerSet } from './reps'

test('cardio é 1 série com duração em minutos', () => {
  expect(isCardio({ sets: 1, reps: '15 min' })).toBe(true)
  expect(isCardio({ sets: 1, reps: '20-30 min' })).toBe(true)
  expect(isCardio({ sets: [null], reps: '20 minutos' })).toBe(true)
  expect(isCardio({ sets: 3, reps: '1 min' })).toBe(false) // prancha 3 × 1 min
  expect(isCardio({ sets: 1, reps: '12' })).toBe(false)
  expect(isCardio({ sets: 1, reps: '30 s' })).toBe(false)
})

test('reps por série só com uma conta por série; faixa de dois números não divide', () => {
  expect(repsPerSet('12-10-8', 3)).toEqual(['12', '10', '8'])
  expect(repsPerSet('12 – 10 – 8', 3)).toEqual(['12', '10', '8'])
  expect(repsPerSet('8-12', 2)).toBeUndefined()
  expect(repsPerSet('12-10-8', 4)).toBeUndefined()
  expect(repsPerSet('12-10-falha', 3)).toBeUndefined()
  expect(repsNumber('8-12')).toBe(8)
  expect(repsNumber('falha')).toBe(0)
})

test('grupos em ordem fixa: força e depois cardio, com a posição original', () => {
  const [strength, cardio] = groupExercises([{ sets: 1, reps: '20 min' }, { sets: 3, reps: '10' }])
  expect(strength).toMatchObject({ cardio: false, items: [{ index: 1 }] })
  expect(cardio).toMatchObject({ cardio: true, items: [{ index: 0 }] })
})
