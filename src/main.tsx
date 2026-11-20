/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import { registerSW } from 'virtual:pwa-register'
import { reloadPending, reloadWhenFree } from './lib/holdUpdates'

registerSW({
  immediate: true,
  // recarregar no meio do onboarding/editor perderia o que a pessoa digitou (ex.: foi ao ChatGPT e voltou)
  onNeedReload: reloadWhenFree,
  // voltar ao app não recarrega a página, então o navegador nunca procuraria versão nova sozinho
  onRegisteredSW: (_url, r) =>
    r && document.addEventListener('visibilitychange', () => {
      if (reloadPending()) reloadWhenFree()
      else if (document.visibilityState === 'visible') void r.update()
    }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* fora do ErrorBoundary: a tela de erro, a instalação e o onboarding também mostram toasts */}
    <Toaster />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
