import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { BASE } from './src/catalog/urls.ts'

// rodapé das Configurações: mostra qual deploy está rodando no aparelho
const commit = () => {
  try { return process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD').toString().trim() } catch { return 'dev' }
}
process.env.VITE_COMMIT = commit().slice(0, 7)
process.env.VITE_BUILT_AT = new Date().toISOString()

export default defineConfig({
  // duas páginas: o app e o editor no computador (editor.html, sem o app nem os dados do aparelho)
  build: { rollupOptions: { input: { main: path.resolve(import.meta.dirname, 'index.html'), editor: path.resolve(import.meta.dirname, 'editor.html') } } },
  plugins: [
    // um script de tema pras duas páginas (app e editor), inline pra não virar uma requisição antes da primeira pintura
    { name: 'theme-boot', transformIndexHtml: (html) => html.replace('<script data-theme-boot></script>', `<script>${readFileSync(path.resolve(import.meta.dirname, 'src/shell/theme-boot.js'), 'utf8')}</script>`) },
    react(),
    tailwindcss(),
    // autoUpdate: o app da tela de início quase nunca é fechado de vez, então a versão nova entra e recarrega na hora (menos com rascunho aberto: src/lib/holdUpdates.ts)
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      // o PDF (react-pdf ~445 KB gzip) só baixa quando pedido, fora do precache
      // ReportDocument-* é o chunk de src/evolution/pdf/ReportDocument.tsx: renomear o arquivo exige mudar aqui
      injectManifest: { globPatterns: ['**/*.{js,css,html,woff2}'], globIgnores: ['**/catalog/**', '**/react-pdf*', '**/ReportDocument-*'] },
      manifest: {
        name: 'Pump',
        short_name: 'Pump',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#13161b',
        theme_color: '#13161b',
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
