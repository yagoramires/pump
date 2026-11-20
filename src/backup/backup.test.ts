import type { Settings, UserData } from '@/schema'
import { stored } from '../../test/store'
import { backupDue, backupParts, buildBackup, exportBackup, importBackupFile, parseBackup } from './backup'
import { allData, replaceAll, save } from '@/storage/db'
import { loadPhoto, savePhoto } from '@/storage/photos'
import * as idb from 'idb-keyval'

const reload = vi.fn()
beforeEach(() => {
  reload.mockClear()
  vi.stubGlobal('location', { ...location, reload })
})

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, set: vi.fn(m.set) }
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(navigator, { canShare: undefined, share: undefined })
})

test('ida e volta', () => {
  const b = buildBackup({ profile: { sex: 'F', heightCm: 165 } }, new Date(2026, 10, 16))
  expect(parseBackup(JSON.stringify(b))).toEqual(b)
})
test.each([
  ['não é JSON', 'oi', 'Arquivo não é um backup válido'],
  ['outro app', JSON.stringify({ app: 'outro', version: 1, data: {} }), 'Esse arquivo não é um backup do Pump'],
  ['versão mais nova', JSON.stringify({ app: 'pump', version: 2, data: {} }), 'Backup de uma versão mais nova do app'],
  ['chave estranha', JSON.stringify({ app: 'pump', version: 1, data: { hack: 1 } }), 'Backup com conteúdo desconhecido'],
  ['plano corrompido', JSON.stringify({ app: 'pump', version: 1, data: { workoutPlan: { workouts: 'x' } } }), 'Backup corrompido'],
  ['medida sem data', JSON.stringify({ app: 'pump', version: 1, data: { measurements: [{ id: 'm', weightKg: 80 }] } }), 'Backup corrompido'],
  ['fotos sem data', JSON.stringify({ app: 'pump', version: 1, data: { photoSets: [{ id: 's' }] } }), 'Backup corrompido'],
])('recusa %s', (_, txt, msg) => expect(() => parseBackup(txt)).toThrow(msg))
test('importar arquivo inválido não apaga nada', async () => {
  await save('profile', { sex: 'M', heightCm: 178 })
  await expect(importBackupFile(new File(['{lixo'], 'x.json'))).rejects.toThrow('Arquivo não é um backup válido')
  expect(reload).not.toHaveBeenCalled()
  expect(await stored('profile')).toEqual({ sex: 'M', heightCm: 178 })
})
test('importar arquivo válido substitui os dados', async () => {
  await save('profile', { sex: 'M', heightCm: 178 })
  const b = buildBackup({ settings: { lastTab: 'dieta', onboardingDone: true } }, new Date(2026, 10, 16))
  await importBackupFile(new File([JSON.stringify(b)], 'x.json'))
  expect(reload).toHaveBeenCalled()
  expect(await stored('profile')).toBeUndefined()
  expect((await stored('settings'))?.lastTab).toBe('dieta')
})
test('backupDue com 14 dias de calendário', () => {
  const s: Settings = { lastTab: 'treino', onboardingDone: true, firstUseAt: '2026-11-01' }
  expect(backupDue(s, '2026-11-14')).toBeUndefined()
  expect(backupDue(s, '2026-11-15')).toBe(14)
  expect(backupDue({ ...s, lastBackupAt: '2026-11-10' }, '2026-11-15')).toBeUndefined()
  expect(backupDue({ ...s, lastBackupAt: '2026-11-10' }, '2026-11-26')).toBe(16)
  expect(backupDue({ lastTab: 'treino', onboardingDone: false }, '2026-11-15')).toBeUndefined()
})

test('backup com fotos: ida e volta traz a imagem', async () => {
  const id = await savePhoto('data:image/jpeg;base64,BBB')
  await save('photoSets', [{ id: 's', date: '2026-11-17', frente: id }])
  const b = buildBackup(await allData(), new Date())
  await replaceAll({})
  expect(await loadPhoto(id)).toBeUndefined()
  await importBackupFile(new File([JSON.stringify(b)], 'b.json'))
  expect(await loadPhoto(id)).toBe('data:image/jpeg;base64,BBB')
})
test('arquivo montado em pedaços é o mesmo JSON e volta igual', async () => {
  const data = { profile: { sex: 'F', heightCm: 165 }, photoSets: [{ id: 's', date: '2026-11-17' }], 'photo:x': 'data:image/jpeg;base64,BBB' }
  const now = new Date(2026, 10, 16)
  const text = await new File(backupParts(data, now), 'b.json').text()
  expect(text).toBe(JSON.stringify(buildBackup(data, now)))
  expect(parseBackup(text).data).toEqual(data)
  expect(await new File(backupParts({}, now), 'b.json').text()).toBe(JSON.stringify(buildBackup({}, now)))
})
test('backup recusa photo: com valor que não é imagem', () =>
  expect(() => parseBackup(JSON.stringify({ app: 'pump', version: 1, data: { 'photo:x': 'oi' } }))).toThrow('Backup com conteúdo desconhecido'))
test('erro ao enviar o backup vira mensagem em pt-BR', async () => {
  Object.assign(navigator, { canShare: () => true, share: vi.fn().mockRejectedValue(new TypeError('Failed to execute share')) })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await expect(exportBackup()).rejects.toThrow('Não consegui enviar o backup')
})
test('backup enviado mesmo se gravar a data falhar', async () => {
  Object.assign(navigator, { canShare: () => true, share: vi.fn().mockResolvedValue(undefined) })
  vi.mocked(idb.set).mockRejectedValueOnce(new Error('quota'))
  await expect(exportBackup()).resolves.toBe('shared')
})
test('backup com dieta: ida e volta', async () => {
  const saved: Partial<UserData> = {
    dietPlan: { menus: [{ id: 'A', name: 'Cardápio', meals: [{ id: 'm1', name: 'Café', time: '07:00', options: [{ id: 'o1', items: [] }] }] }], lastMenuId: 'A' },
    dietLog: { '2026-11-18': { menuId: 'A', menuName: 'Cardápio', meals: [], free: true } },
    waterLog: { '2026-11-18': { ml: 500, goalMl: 2500 } },
    supplementLog: { '2026-11-18': { taken: ['a'], total: 2 } },
    foods: [],
  }
  const keys = Object.keys(saved) as (keyof UserData)[]
  for (const k of keys) await save(k, saved[k]!)
  const b = buildBackup(await allData(), new Date(2026, 10, 18))
  await replaceAll({})
  await importBackupFile(new File([JSON.stringify(b)], 'b.json'))
  for (const k of keys) expect(await stored(k)).toEqual(saved[k])
})
