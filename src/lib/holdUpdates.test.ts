import { renderHook } from '@testing-library/react'
import { reloadPending, reloadWhenFree, useHoldUpdates } from './holdUpdates'

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
