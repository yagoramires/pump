import type { Profile } from '@/profile/types'
import { goalDirection, isGood } from './goal'

const p: Profile = { sex: 'M', heightCm: 1 }

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
test('isGood: gordura sempre caindo; o resto só na direção do objetivo', () => {
  expect(isGood('fat', null, -1)).toBe(true)
  expect(isGood('armCm', 'gain', 1)).toBe(true)
  expect(isGood('armCm', 'loss', 1)).toBe(false)
  expect(isGood('waistCm', 'loss', -1)).toBe(true)
  expect(isGood('waistCm', 'gain', -1)).toBe(false)
  expect(isGood('weightKg', null, -1)).toBe(false)
})
