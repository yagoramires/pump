import { renderHook } from '@testing-library/react'
import { reloadPending, reloadWhenFree, updateNow, useHoldUpdates } from './holdUpdates'

test('versão nova espera a tela com rascunho sair e recarrega na próxima chance', () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...location, reload })
  const editor = renderHook(() => useHoldUpdates())
  reloadWhenFree()
  expect(reload).not.toHaveBeenCalled()
  expect(reloadPending()).toBe(true)
  editor.unmount()
  reloadWhenFree()
  expect(reload).toHaveBeenCalledOnce()
  vi.unstubAllGlobals()
})

describe('updateNow', () => {
  const setup = (registration: unknown) => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...location, reload })
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) } })
    return reload
  }
  afterEach(() => vi.unstubAllGlobals())

  test('procura versão nova e recarrega', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const reload = setup({ update })
    await updateNow()
    expect(update).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })

  test('recarrega mesmo sem service worker registrado', async () => {
    const reload = setup(undefined)
    await updateNow()
    expect(reload).toHaveBeenCalledOnce()
  })

  test('recarrega mesmo quando a busca falha (sem internet)', async () => {
    const reload = setup({ update: vi.fn().mockRejectedValue(new Error('offline')) })
    await updateNow()
    expect(reload).toHaveBeenCalledOnce()
  })
})
