import { defineConfig, minimal2023Preset as base } from '@vite-pwa/assets-generator/config'

// public/icon.png já vem com a folga em volta do logo: sem padding extra no apple/pwa; o maskable acomoda o logo diagonal na área segura do Android
const bg = { background: '#000000' }

export default defineConfig({
  preset: {
    ...base,
    transparent: { ...base.transparent, padding: 0 },
    maskable: { ...base.maskable, padding: 0.2, resizeOptions: bg },
    apple: { ...base.apple, padding: 0, resizeOptions: bg },
  },
  images: ['public/icon.png'],
})
