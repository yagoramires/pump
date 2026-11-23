import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/figtree'
import '../index.css'
import { memoryOnly } from '@/storage/db'
import { Toaster } from '@/components/ui/sonner'
import { EditorPage } from './EditorPage'

// antes de qualquer render: a página não pode ler nem gravar os dados do app instalado neste navegador
memoryOnly()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster />
    <EditorPage />
  </StrictMode>,
)
