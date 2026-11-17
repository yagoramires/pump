import { act, renderHook, waitFor } from '@testing-library/react'
import * as idb from 'idb-keyval'
import { clear } from 'idb-keyval'
import { DEFAULT_SETTINGS } from '../types'
import { allData, load, replaceAll, resetStoreForTests, save, usePersisted } from './db'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get), set: vi.fn(m.set) }
})

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

test('save/load ida e volta; replaceAll grava e remove sobras', async () => {
  await save('profile', { sex: 'M', heightCm: 178, weightKg: 80 })
  expect(await load('profile')).toEqual({ sex: 'M', heightCm: 178, weightKg: 80 })
  await replaceAll({ settings: { lastTab: 'dieta', onboardingDone: true } })
  expect(await load('profile')).toBeUndefined()
  expect(Object.keys(await allData())).toEqual(['settings'])
})
test('duas cópias da mesma chave: gravar por uma atualiza a outra', async () => {
  const a = renderHook(() => usePersisted('settings', DEFAULT_SETTINGS))
  const b = renderHook(() => usePersisted('settings', DEFAULT_SETTINGS))
  await waitFor(() => expect(a.result.current[2]).toBe(true))
  act(() => a.result.current[1]({ ...DEFAULT_SETTINGS, lastTab: 'dieta' }))
  await waitFor(() => expect(b.result.current[0].lastTab).toBe('dieta'))
  await act(() => save('settings', { ...b.result.current[0], lastBackupAt: '2026-11-16' })) // escrita fora do hook
  await waitFor(() => expect(a.result.current[0].lastBackupAt).toBe('2026-11-16'))
})
test('replaceAll avisa as cópias abertas', async () => {
  const h = renderHook(() => usePersisted('workoutLog', {}))
  await waitFor(() => expect(h.result.current[2]).toBe(true))
  await act(() => replaceAll({ workoutLog: { '2026-11-10': { date: '2026-11-10', workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] } } }))
  await waitFor(() => expect(Object.keys(h.result.current[0])).toEqual(['2026-11-10']))
})
test('load lento não sobrescreve um save que terminou antes', async () => {
  await save('settings', { ...DEFAULT_SETTINGS, lastTab: 'evolucao' })
  resetStoreForTests()
  const real = await vi.mocked(idb.get).getMockImplementation()!
  vi.mocked(idb.get).mockImplementationOnce(async (k) => {
    const old = await real(k)
    await new Promise((r) => setTimeout(r, 30)) // o get demora, o save abaixo termina antes
    return old
  })
  const h = renderHook(() => usePersisted('settings', DEFAULT_SETTINGS))
  await act(() => save('settings', { ...DEFAULT_SETTINGS, lastTab: 'dieta' }))
  await waitFor(() => expect(h.result.current[2]).toBe(true))
  expect(h.result.current[0].lastTab).toBe('dieta')
  expect((await load('settings'))?.lastTab).toBe('dieta')
})
test('dois updaters no mesmo act se acumulam', async () => {
  const h = renderHook(() => usePersisted('workoutLog', {}))
  await waitFor(() => expect(h.result.current[2]).toBe(true))
  const s = (d: string) => ({ date: d, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] })
  await act(async () => {
    h.result.current[1]((p) => ({ ...p, '2026-11-01': s('2026-11-01') }))
    h.result.current[1]((p) => ({ ...p, '2026-11-02': s('2026-11-02') }))
  })
  await waitFor(() => expect(Object.keys(h.result.current[0]).sort()).toEqual(['2026-11-01', '2026-11-02']))
})
test('falha no load: marca loaded, avisa e não deixa gravar por cima do que está salvo', async () => {
  const s = (d: string) => ({ date: d, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] })
  await save('workoutLog', { '2026-11-01': s('2026-11-01'), '2026-11-02': s('2026-11-02') })
  resetStoreForTests()
  const errors: unknown[] = []
  const onError = (e: Event) => errors.push((e as CustomEvent).detail)
  window.addEventListener('pump:storage-error', onError)
  vi.mocked(idb.get).mockRejectedValueOnce(new Error('boom'))
  const h = renderHook(() => usePersisted('workoutLog', {}))
  await waitFor(() => expect(h.result.current[2]).toBe(true))
  act(() => h.result.current[1]((p) => ({ ...p, '2026-11-16': s('2026-11-16') })))
  await new Promise((r) => setTimeout(r, 20))
  window.removeEventListener('pump:storage-error', onError)
  resetStoreForTests()
  expect(Object.keys((await load('workoutLog'))!).sort()).toEqual(['2026-11-01', '2026-11-02'])
  expect(errors[0]).toEqual({ message: 'boom', read: true })
  expect(errors).toHaveLength(2) // a tentativa de gravar também avisa
})
test('saves sobrepostos: um save que termina depois não desfaz o update seguinte', async () => {
  const h = renderHook(() => usePersisted('workoutLog', {}))
  await waitFor(() => expect(h.result.current[2]).toBe(true))
  const real = vi.mocked(idb.set).getMockImplementation()!
  vi.mocked(idb.set)
    .mockImplementationOnce(real)
    .mockImplementationOnce(async (k, v) => {
      await real(k, v)
      await new Promise((r) => setTimeout(r, 40)) // o segundo save demora pra terminar
    })
  const s = (d: string) => ({ date: d, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] })
  const add = (d: string) => act(() => h.result.current[1]((p) => ({ ...p, [d]: s(d) })))
  add('a')
  add('b')
  await new Promise((r) => setTimeout(r, 15)) // o save de a já terminou, o de b ainda não
  add('c')
  await new Promise((r) => setTimeout(r, 60))
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['a', 'b', 'c'])
  resetStoreForTests()
  expect(Object.keys((await load('workoutLog'))!).sort()).toEqual(['a', 'b', 'c'])
})
test('replaceAll não guarda fotos no cache em memória (loadPhoto lê direto do banco)', async () => {
  await replaceAll({ 'photo:a': 'data:image/jpeg;base64,AAA', settings: { lastTab: 'treino', onboardingDone: true } })
  await idb.del('photo:a')
  expect(await load('photo:a' as never)).toBeUndefined()
})
