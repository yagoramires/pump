import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, Suspense, type ReactNode } from 'react'
import * as idb from 'idb-keyval'
import { clear } from 'idb-keyval'
import { DEFAULTS, type UserData } from '@/schema'
import { renderHookLoaded } from '../../test/render'
import { allData, load, onStorageError, readKey, replaceAll, resetStoreForTests, save, StorageReadError, usePersisted } from './db'

vi.mock('idb-keyval', async (orig) => {
  const m = await orig<typeof import('idb-keyval')>()
  return { ...m, get: vi.fn(m.get), set: vi.fn(m.set) }
})

beforeEach(async () => {
  await clear()
  resetStoreForTests()
})

const wrapper = ({ children }: { children: ReactNode }) => createElement(Suspense, { fallback: null }, children)
const persisted = <K extends keyof UserData>(k: K) => renderHookLoaded(() => usePersisted(k))
const session = (d: string) => ({ date: d, workoutId: 'a', workoutLabel: 'A', workoutName: 'A', exercises: [] })
function deferred<T = void>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

test('save/load ida e volta; replaceAll grava e remove sobras', async () => {
  await save('profile', { sex: 'M', heightCm: 178 })
  expect(await load('profile')).toEqual({ sex: 'M', heightCm: 178 })
  await replaceAll({ settings: { lastTab: 'dieta', onboardingDone: true } })
  expect(await load('profile')).toBeUndefined()
  expect(Object.keys(await allData())).toEqual(['settings'])
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
  await waitFor(async () => expect((await idb.get('settings'))?.lastBackupAt).toBe('2026-11-16'))
})
test('replaceAll avisa as cópias abertas', async () => {
  const h = await persisted('workoutLog')
  await act(() => replaceAll({ workoutLog: { '2026-11-10': session('2026-11-10') } }))
  expect(Object.keys(h.result.current[0])).toEqual(['2026-11-10'])
})
test('leitura lenta não sobrescreve um save que terminou antes', async () => {
  await save('settings', { ...DEFAULTS.settings, lastTab: 'evolucao' })
  resetStoreForTests()
  const real = vi.mocked(idb.get).getMockImplementation()!
  const slow = deferred()
  vi.mocked(idb.get).mockImplementationOnce(async (k) => {
    const old = await real(k)
    await slow.promise // o get demora, o save abaixo termina antes
    return old
  })
  let h!: ReturnType<typeof renderHook<ReturnType<typeof usePersisted<'settings'>>, unknown>>
  const rendering = act(async () => { h = renderHook(() => usePersisted('settings'), { wrapper }) })
  await save('settings', { ...DEFAULTS.settings, lastTab: 'dieta' })
  expect(h.result.current).toBeNull() // ainda lendo
  slow.resolve()
  await rendering
  expect(h.result.current[0].lastTab).toBe('dieta')
  expect((await load('settings'))?.lastTab).toBe('dieta')
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
  await save('workoutLog', { '2026-11-01': session('2026-11-01') })
  resetStoreForTests()
  const errors: string[] = []
  const off = onStorageError((m) => errors.push(m))
  vi.mocked(idb.get).mockRejectedValueOnce(new Error('boom'))
  const read = readKey('workoutLog')
  await expect(read).rejects.toBeInstanceOf(StorageReadError)
  await expect(read).rejects.toThrow('boom')
  expect(readKey('workoutLog')).toBe(read) // a mesma leitura falha: só recarregar tenta de novo
  off()
  expect(errors).toEqual([])
  resetStoreForTests()
  expect(await load('workoutLog')).toEqual({ '2026-11-01': session('2026-11-01') })
})
test('falha ao gravar: a tela já mudou e o aviso sai uma vez só', async () => {
  const h = await persisted('workoutLog')
  const errors: string[] = []
  const off = onStorageError((m) => errors.push(m))
  vi.mocked(idb.set).mockRejectedValueOnce(new Error('cheio'))
  act(() => void h.result.current[1]((p) => ({ ...p, a: session('a') })))
  expect(Object.keys(h.result.current[0])).toEqual(['a'])
  await waitFor(() => expect(errors).toEqual(['cheio']))
  await new Promise((r) => setTimeout(r)) // toda a cadeia de promises já rodou: um segundo aviso teria saído antes disso
  off()
  expect(errors).toEqual(['cheio'])
})
test('save lento não desfaz o update seguinte', async () => {
  const h = await persisted('workoutLog')
  const real = vi.mocked(idb.set).getMockImplementation()!
  const slow = deferred()
  vi.mocked(idb.set).mockImplementationOnce(async (k, v) => {
    await real(k, v)
    await slow.promise // o save de a demora pra terminar
  })
  const add = (d: string) => act(() => void h.result.current[1]((p) => ({ ...p, [d]: session(d) })))
  add('a')
  add('b')
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['a', 'b'])
  await act(async () => slow.resolve())
  expect(Object.keys(h.result.current[0]).sort()).toEqual(['a', 'b'])
  await waitFor(async () => expect(Object.keys((await idb.get('workoutLog'))!).sort()).toEqual(['a', 'b']))
})
test('chave fora do schema não fica no cache em memória (loadPhoto lê direto do banco)', async () => {
  await replaceAll({ 'photo:a': 'data:image/jpeg;base64,AAA', settings: { lastTab: 'treino', onboardingDone: true } })
  await idb.del('photo:a')
  expect(await load('photo:a' as never)).toBeUndefined()
})
