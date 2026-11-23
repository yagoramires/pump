import { applyTheme, THEME_KEY } from './theme'

const mockMedia = (light: boolean) => {
  const listeners = new Set<() => void>()
  const media = { matches: light, addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f) }
  vi.stubGlobal('matchMedia', () => media)
  return { media, listeners }
}

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" media="(prefers-color-scheme: light)"><meta name="theme-color" media="(prefers-color-scheme: dark)">'
})
afterEach(() => vi.unstubAllGlobals())

const metas = () => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content)

test('escolha fixa grava data-theme, data-mode, espelho e a mesma cor nas duas metas', () => {
  mockMedia(false)
  applyTheme('light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(document.documentElement.dataset.mode).toBe('light')
  expect(localStorage.getItem(THEME_KEY)).toBe('light')
  expect(metas()).toEqual(['#f2f3f5', '#f2f3f5'])
})

test('sem tema salvo vale escuro', () => {
  mockMedia(true)
  applyTheme(undefined)
  expect(document.documentElement.dataset.mode).toBe('dark')
})

test('modo Sistema segue o aparelho e acompanha a troca', () => {
  const { media, listeners } = mockMedia(true)
  applyTheme('system')
  expect(document.documentElement.dataset.mode).toBe('light')
  expect(metas()).toEqual(['#f2f3f5', '#13161b'])
  media.matches = false
  listeners.forEach((f) => f())
  expect(document.documentElement.dataset.mode).toBe('dark')
  applyTheme('dark')
  expect(listeners.size).toBe(0)
})
