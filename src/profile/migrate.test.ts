import * as idb from 'idb-keyval'
import type { Profile } from './types'
import { migrateData, migrateOnBoot, migrateStored } from './migrate'
import { readCurrent } from '@/storage/db'
import { seedStore, stored } from '../../test/store'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, set: vi.fn(m.set) }
})

let warn: { mockRestore: () => void } | undefined
afterEach(() => warn?.mockRestore())

const OLD = { profile: { sex: 'M', heightCm: 178, weightKg: 82.4, anamnesis: { goal: 'forca', age: 30, daysPerWeek: 4, notes: 'ombro', level: 'avancado' }, dietAnamnesis: { goal: 'perder', wake: '06:30', train: '18:00', sleep: '23:00', meals: 5 } }, measurements: [], settings: { firstUseAt: '2026-11-01' } }

test('abrir o app com perfil já migrado não grava nada', async () => {
  await seedStore({ profile: { sex: 'M', heightCm: 178, focus: 'forca', anamnesis: { level: 'avancado' } }, measurements: [] })
  vi.mocked(idb.set).mockClear()
  await migrateStored()
  expect(idb.set).not.toHaveBeenCalled()
})
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
  await seedStore({ profile: OLD.profile as never, settings: { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' } })
  await migrateStored()
  expect(await readCurrent('measurements')).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }])
  expect(await readCurrent('profile')).not.toHaveProperty('weightKg')
  expect(await readCurrent('profile')).toMatchObject({ focus: 'forca', dietGoal: 'perder', age: 30 })
})
test('falha ao gravar a migração não rejeita e não apaga o peso do perfil no disco', async () => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await seedStore({ profile: OLD.profile as never, settings: { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' } })
  vi.mocked(idb.set).mockRejectedValueOnce(new Error("cheio"))
  await expect(migrateOnBoot()).resolves.toBeUndefined()
  expect(await stored('profile')).toHaveProperty('weightKg')
  expect(await readCurrent('measurements')).toMatchObject([{ date: '2026-11-01', weightKg: 82.4 }])
  expect(console.warn).toHaveBeenCalled()
})
