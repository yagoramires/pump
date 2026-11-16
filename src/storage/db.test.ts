import { act, renderHook, waitFor } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { DEFAULT_SETTINGS } from '../types'
import { allData, load, replaceAll, resetStoreForTests, save, usePersisted } from './db'

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
