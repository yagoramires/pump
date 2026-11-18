import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const BASE = '/pump/'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // sem registerType: fica 'prompt' sem UI, a versão nova entra quando o app é fechado de vez
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      // o PDF (react-pdf ~445 KB gzip) só baixa quando pedido, fora do precache
      injectManifest: { globIgnores: ['**/catalog/**', '**/react-pdf*', '**/ReportDocument-*'] },
      manifest: {
        name: 'Pump',
        short_name: 'Pump',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#121315',
        theme_color: '#121315',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: BASE,
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // os testes de data (horário de verão, virada do dia) assumem o fuso do app
  test: { environment: 'jsdom', globals: true, setupFiles: ['test/setup.ts'], env: { TZ: 'America/Sao_Paulo' } },
})
