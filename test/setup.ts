import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, vi } from 'vitest'
import { toast } from 'sonner'
import { fakeCacheStorage } from './helpers'

window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
globalThis.caches = fakeCacheStorage({})
// vaul chama pointer capture no onPointerDown e o jsdom não implementa
HTMLElement.prototype.setPointerCapture ??= () => {}
HTMLElement.prototype.releasePointerCapture ??= () => {}
HTMLElement.prototype.hasPointerCapture ??= () => false
// o ScrollArea do Radix observa o tamanho e o jsdom não tem ResizeObserver
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
// o File do jsdom pode não ter .text()
Blob.prototype.text ??= function (this: Blob) { return new Response(this).text() }
// a fila do sonner é global: sem isso um <Toaster/> novo mostra os toasts do teste anterior
afterEach(() => { toast.dismiss() })
// import dinâmico: estático, o db.ts carregaria antes do vi.mock('idb-keyval') dos testes
beforeEach(async () => {
  const [{ clear }, { resetStoreForTests }] = await Promise.all([import('idb-keyval'), import('../src/storage/db')])
  await clear()
  resetStoreForTests()
})
