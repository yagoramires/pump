import type { Profile } from '@/profile/types'
import { bodyFat } from './bodyFat'
import { goalDirection } from './goal'

const p: Profile = { sex: 'M', heightCm: 1 }

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
test('goalDirection: perder/ganhar pelo objetivo da dieta; manter ou sem objetivo é null', () => {
  expect(goalDirection(p)).toBeNull()
  expect(goalDirection({ ...p, dietGoal: 'manter' })).toBeNull()
  expect(goalDirection({ ...p, dietGoal: 'perder' })).toBe('loss')
  expect(goalDirection({ ...p, dietGoal: 'perder-rapido' })).toBe('loss')
  expect(goalDirection({ ...p, dietGoal: 'ganhar-rapido' })).toBe('gain')
})

test('goalDirection: ignora objetivos desconhecidos em backups', () => {
  expect(goalDirection({ ...p, dietGoal: 'constructor' as Profile['dietGoal'] })).toBeNull()
})
