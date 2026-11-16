import { defineConfig, minimal2023Preset as base } from '@vite-pwa/assets-generator/config'

// o padding do apple/maskable sai branco por padrão: pinta com o fundo do ícone
const bg = { background: '#121315' }

export default defineConfig({
  preset: {
    ...base,
    maskable: { ...base.maskable, resizeOptions: bg },
    apple: { ...base.apple, resizeOptions: bg },
  },
  images: ['public/icon.svg'],
})
