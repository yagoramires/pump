import type { Profile } from '@/profile/types'
import { bodyFat, goalDirection } from './bodyFat'

const p: Profile = { sex: 'M', heightCm: 1, weightKg: 1 }

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
test('goalDirection sem objetivo é perder', () => {
  expect(goalDirection(p)).toBe('loss')
})
test('goalDirection: objetivo da dieta manda em perder/ganhar; manter cai no do treino', () => {
  expect(goalDirection({ ...p, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'perder' } })).toBe('loss')
  expect(goalDirection({ ...p, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'manter' } })).toBe('gain')
  expect(goalDirection({ ...p, dietAnamnesis: { goal: 'ganhar-rapido' } })).toBe('gain')
  expect(goalDirection({ ...p, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'perder-rapido' } })).toBe('loss')
})
