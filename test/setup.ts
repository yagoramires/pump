import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'
import { fakeCacheStorage } from './helpers'

window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
globalThis.caches = fakeCacheStorage({})
// vaul chama pointer capture no onPointerDown e o jsdom não implementa
HTMLElement.prototype.setPointerCapture ??= () => {}
HTMLElement.prototype.releasePointerCapture ??= () => {}
HTMLElement.prototype.hasPointerCapture ??= () => false
// o File do jsdom pode não ter .text()
Blob.prototype.text ??= function (this: Blob) { return new Response(this).text() }
