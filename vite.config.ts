import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pump/',
  test: { environment: 'jsdom', globals: true, setupFiles: ['test/setup.ts'] },
})
