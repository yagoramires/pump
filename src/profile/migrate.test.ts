import { clear, set } from 'idb-keyval'
import type { Profile } from './types'
import { migrateData, migrateStored } from './migrate'
import { importBackupFile } from '@/storage/backup'
import { readCurrent, resetStoreForTests } from '@/storage/db'

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

const OLD = { profile: { sex: 'M', heightCm: 178, weightKg: 82.4, anamnesis: { goal: 'forca', age: 30, daysPerWeek: 4, notes: 'ombro', level: 'avancado' }, dietAnamnesis: { goal: 'perder', wake: '06:30', train: '18:00', sleep: '23:00', meals: 5 } }, measurements: [], settings: { firstUseAt: '2026-11-01' } }

test('sobe campos comuns e separa objetivos', () => {
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, anamnesis: { goal: 'forca', age: 30, daysPerWeek: 4, notes: 'ombro', level: 'avancado' }, dietAnamnesis: { goal: 'perder', wake: '06:30', train: '18:00', sleep: '23:00', meals: 5 } } }, '2026-11-18')
  expect(out.profile).toEqual({ sex: 'M', heightCm: 178, age: 30, daysPerWeek: 4, notes: 'ombro', wake: '06:30', train: '18:00', sleep: '23:00', dietGoal: 'perder', focus: 'forca', anamnesis: { level: 'avancado' }, dietAnamnesis: { meals: 5 } })
})
test.each([['emagrecer', 'perder', 'hipertrofia'], ['hipertrofia', 'ganhar', 'hipertrofia'], ['forca', undefined, 'forca'], ['saude', undefined, 'condicionamento']])('objetivo de treino %s sem dieta', (goal, dietGoal, focus) => {
  const p = migrateData({ profile: { sex: 'F', heightCm: 160, anamnesis: { goal } } }, '2026-11-18').profile as Profile
  expect(p.dietGoal).toBe(dietGoal)
  expect(p.focus).toBe(focus)
})
test('objetivo da dieta antigo vence o do treino', () => {
  const p = migrateData({ profile: { sex: 'M', heightCm: 170, anamnesis: { goal: 'hipertrofia' }, dietAnamnesis: { goal: 'manter' } } }, '2026-11-18').profile as Profile
  expect(p.dietGoal).toBe('manter')
})
test('campo comum que o perfil já tem não é sobrescrito', () => {
  const p = migrateData({ profile: { sex: 'M', heightCm: 170, age: 25, anamnesis: { age: 40 } } }, '2026-11-18').profile as Profile
  expect(p.age).toBe(25)
  expect(p.anamnesis).toEqual({})
})
test('peso do perfil vira medição em firstUseAt quando não há peso medido', () => {
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, weightKg: 82.4 }, measurements: [], settings: { firstUseAt: '2026-11-01' } }, '2026-11-18')
  expect(out.measurements).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }])
  expect(out.profile).not.toHaveProperty('weightKg')
})
test('peso do perfil some sem criar medição quando já há peso medido', () => {
  const ms = [{ id: 'a', date: '2026-11-10', weightKg: 80 }]
  const out = migrateData({ profile: { sex: 'M', heightCm: 178, weightKg: 82.4 }, measurements: ms }, '2026-11-18')
  expect(out.measurements).toEqual(ms)
  expect(out.profile).not.toHaveProperty('weightKg')
})
test('idempotente', () => {
  const once = migrateData(OLD, '2026-11-18')
  expect(migrateData(once, '2026-11-18')).toEqual(once)
})
test('migrateStored grava o perfil migrado e a medição no store', async () => {
  await set('profile', OLD.profile)
  await set('settings', { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' })
  await migrateStored()
  expect(await readCurrent('measurements')).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }])
  expect(await readCurrent('profile')).not.toHaveProperty('weightKg')
  expect(await readCurrent('profile')).toMatchObject({ focus: 'forca', dietGoal: 'perder', age: 30 })
})
test('importBackupFile migra um backup antigo', async () => {
  const data = { profile: { sex: 'F', heightCm: 160, anamnesis: { goal: 'saude' } } }
  await importBackupFile(new File([JSON.stringify({ app: 'pump', version: 1, exportedAt: '2026-11-01T00:00:00Z', data })], 'b.json'))
  expect((await readCurrent('profile')).focus).toBe('condicionamento')
})
