import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, Suspense, type ReactNode } from 'react'
import * as idb from 'idb-keyval'
import { DEFAULTS, type UserData } from '@/schema'
import { renderHookLoaded } from '../../test/render'
import { seedStore, stored } from '../../test/store'
import { allData, onStorageError, readCurrent, replaceAll, save, StorageReadError, usePersisted } from './db'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get), set: vi.fn(m.set) }
})

const wrapper = ({ children }: { children: ReactNode }) => createElement(Suspense, { fallback: null }, children)
const persisted = <K extends keyof UserData>(k: K) => renderHookLoaded(() => usePersisted(k))
const session = (d: string) => ({ date: d, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] })
function deferred<T = void>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

test('save/stored ida e volta; replaceAll grava e remove sobras', async () => {
  await save('profile', { sex: 'M', heightCm: 178 })
  expect(await stored('profile')).toEqual({ sex: 'M', heightCm: 178 })
  await replaceAll({ settings: { lastTab: 'dieta', onboardingDone: true } })
  expect(await stored('profile')).toBeUndefined()
  expect(Object.keys(await allData())).toEqual(['settings'])
})
test('replaceAll mantém todos os dados se uma gravação falhar', async () => {
  const settings = { ...DEFAULTS.settings, lastTab: 'dieta' as const }
  const profile = { sex: 'M' as const, heightCm: 178 }
  await save('settings', settings)
  await save('profile', profile)
  await expect(replaceAll({ settings: DEFAULTS.settings, invalid: () => {} })).rejects.toThrow()
  expect(await allData()).toEqual({ settings, profile })
})
test('chave nunca gravada lê DEFAULTS', async () => {
  const h = await persisted('workoutLog')
  expect(h.result.current[0]).toEqual(DEFAULTS.workoutLog)
})
test('duas cópias da mesma chave: o setter devolve o valor e a outra cópia vê na hora', async () => {
  const a = await persisted('settings')
  const b = await persisted('settings')
  let returned
  act(() => { returned = a.result.current[1]({ ...DEFAULTS.settings, lastTab: 'dieta' }) })
  expect(returned).toEqual({ ...DEFAULTS.settings, lastTab: 'dieta' })
  expect(b.result.current[0].lastTab).toBe('dieta')
  act(() => void save('settings', { ...b.result.current[0], lastBackupAt: '2026-11-16' }))
  expect(a.result.current[0].lastBackupAt).toBe('2026-11-16')
  await waitFor(async () => expect((await stored('settings'))?.lastBackupAt).toBe('2026-11-16'))
})
test('leitura lenta não sobrescreve um save que terminou antes', async () => {
  await seedStore({ settings: { ...DEFAULTS.settings, lastTab: 'evolucao' } })
  const real = vi.mocked(idb.get).getMockImplementation()!
  const slow = deferred()
  vi.mocked(idb.get).mockImplementationOnce(async (k, store) => {
    const old = await real(k, store)
    await slow.promise // o get demora, o save abaixo termina antes
    return old
  })
  let h!: ReturnType<typeof renderHook<ReturnType<typeof usePersisted<'settings'>>, unknown>>
  const rendering = act(async () => { h = renderHook(() => usePersisted('settings'), { wrapper }) })
  await save('settings', { ...DEFAULTS.settings, lastTab: 'dieta' })
  expect(h.result.current).toBeNull()
  slow.resolve()
  await rendering
  expect(h.result.current[0].lastTab).toBe('dieta')
  expect((await readCurrent('settings')).lastTab).toBe('dieta')
})
test('dois updaters seguidos se acumulam e cada um devolve o próprio resultado', async () => {
  const h = await persisted('workoutLog')
  const out: string[][] = []
  act(() => {
    out.push(Object.keys(h.result.current[1]((p) => ({ ...p, '2026-11-01': session('2026-11-01') }))))
    out.push(Object.keys(h.result.current[1]((p) => ({ ...p, '2026-11-02': session('2026-11-02') }))))
  })
  expect(out).toEqual([['2026-11-01'], ['2026-11-01', '2026-11-02']])
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['2026-11-01', '2026-11-02'])
})
test('falha na leitura: StorageReadError, sem aviso de gravação e sem mexer no que está salvo', async () => {
  await seedStore({ workoutLog: { '2026-11-01': session('2026-11-01') } })
  const errors: string[] = []
  const off = onStorageError((m) => errors.push(m))
  vi.mocked(idb.get).mockRejectedValueOnce(new Error('boom'))
  const read = readCurrent('workoutLog')
  await expect(read).rejects.toBeInstanceOf(StorageReadError)
  await expect(read).rejects.toThrow('boom')
  await expect(readCurrent('workoutLog')).rejects.toThrow('boom') // a mesma leitura falha: só recarregar tenta de novo
  off()
  expect(errors).toEqual([])
  expect(await stored('workoutLog')).toEqual({ '2026-11-01': session('2026-11-01') })
})
test('falha ao gravar: a tela já mudou e sai um aviso', async () => {
  const h = await persisted('workoutLog')
  const errors: string[] = []
  const off = onStorageError((m) => errors.push(m))
  vi.mocked(idb.set).mockRejectedValueOnce(new Error('cheio'))
  act(() => void h.result.current[1]((p) => ({ ...p, a: session('a') })))
  expect(Object.keys(h.result.current[0])).toEqual(['a'])
  await waitFor(() => expect(errors).toEqual(['cheio']))
  off()
  expect(errors).toEqual(['cheio'])
})
test('save lento não desfaz o update seguinte', async () => {
  const h = await persisted('workoutLog')
  const real = vi.mocked(idb.set).getMockImplementation()!
  const slow = deferred()
  vi.mocked(idb.set).mockImplementationOnce(async (k, v, store) => {
    await real(k, v, store)
    await slow.promise // o save de a demora pra terminar
  })
  const add = (d: string) => act(() => void h.result.current[1]((p) => ({ ...p, [d]: session(d) })))
  add('a')
  add('b')
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['a', 'b'])
  await act(async () => slow.resolve())
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['a', 'b'])
  await waitFor(async () => expect(Object.keys((await stored('workoutLog'))!).sort()).toEqual(['a', 'b']))
})
