import { bodyFat, goalDirection } from './bodyFat'

test('bodyFat masculino e feminino (fórmula do gorgonoid)', () => {
  expect(bodyFat('M', 178, { neckCm: 38, waistCm: 85 })).toBe(18.4)
  expect(bodyFat('F', 165, { neckCm: 32, waistCm: 70, hipCm: 95 })).toBe(24.9)
})
test('bodyFat sem dado ou inválido é null', () => {
  expect(bodyFat('M', 0, { neckCm: 38, waistCm: 85 })).toBeNull()
  expect(bodyFat('M', 178, { waistCm: 85 })).toBeNull()
  expect(bodyFat('M', 178, { neckCm: 90, waistCm: 85 })).toBeNull()
  expect(bodyFat('F', 165, { neckCm: 32, waistCm: 70 })).toBeNull()
})
test('goalDirection', () => {
  expect(goalDirection({ sex: 'M', heightCm: 1, weightKg: 1, anamnesis: { goal: 'hipertrofia' } })).toBe('gain')
  expect(goalDirection({ sex: 'M', heightCm: 1, weightKg: 1 })).toBe('loss')
})
