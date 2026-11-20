import { bodyFat } from './bodyFat'

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
test('bodyFat fora de 2–75% é null', () => {
  expect(bodyFat('M', 178, { neckCm: 40, waistCm: 42 })).toBeNull() // daria negativo
  expect(bodyFat('M', 1.75, { neckCm: 38, waistCm: 85 })).toBeNull() // altura em metros: ~208%
})
