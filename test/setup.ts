import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'
import { fakeCacheStorage } from './helpers'

window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
globalThis.caches = fakeCacheStorage({})
