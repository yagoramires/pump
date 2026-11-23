import type { Theme } from '@/schema'

export const THEME_KEY = 'pump-theme'
/** cor da barra do navegador por modo: o bg de cada um (index.css) */
const BAR = { light: '#f2f3f5', dark: '#13161b' } as const
const LIGHT_QUERY = '(prefers-color-scheme: light)'

let stopListening = () => {}

/** data-theme escolhe o color-scheme no CSS; data-mode (modo resolvido) alimenta o variant dark: e o boneco */
export function applyTheme(theme: Theme = 'dark') {
  const root = document.documentElement
  root.dataset.theme = theme
  stopListening()
  stopListening = () => {}
  const media = matchMedia(LIGHT_QUERY)
  const resolve = () => {
    const mode = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
    root.dataset.mode = mode
    // com o modo Sistema as duas metas seguem a mídia; com escolha fixa, as duas levam a cor escolhida
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = theme === 'system' ? BAR[meta.getAttribute('media')?.includes('light') ? 'light' : 'dark'] : BAR[mode]
    }
  }
  resolve()
  if (theme === 'system') {
    media.addEventListener('change', resolve)
    stopListening = () => media.removeEventListener('change', resolve)
  }
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // navegação privada sem localStorage: só perde o espelho da primeira pintura
  }
}
