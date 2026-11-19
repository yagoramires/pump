/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* fora do ErrorBoundary: a tela de erro, a instalação e o onboarding também mostram toasts */}
    <Toaster />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
