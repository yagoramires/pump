import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useBackupExport } from './useBackupExport'
import { StorageReadError } from '@/storage/db'

export function CenteredScreen({ role, children }: { role?: 'alert'; children: ReactNode }) {
  return <main role={role} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">{children}</main>
}

function FatalScreen({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <CenteredScreen role="alert">
      <EmptyState icon={<AlertTriangle size={30} aria-hidden="true" />} title={title} tone="negative">
        <p className="max-w-xs text-sm text-text-2">{text}</p>
        <div className="mt-3 flex w-full max-w-xs flex-col gap-2">{children}</div>
      </EmptyState>
    </CenteredScreen>
  )
}

function CrashScreen() {
  const { send, error } = useBackupExport()
  return (
    <FatalScreen title="Algo deu errado" text="Seus dados continuam salvos neste aparelho. Exporte um backup por garantia e recarregue o app.">
      <Button type="button" variant="secondary" onClick={send}>Exportar backup</Button>
      <Button type="button" onClick={() => location.reload()}>Recarregar</Button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </FatalScreen>
  )
}

// qualquer chave ilegível bloqueia o app: seguir com dados vazios levaria a montagem a gravar por cima
function ReadFailedScreen() {
  return (
    <FatalScreen title="Não consegui ler seus dados" text="Eles continuam guardados neste aparelho. Feche e abra o app ou tente de novo.">
      <Button type="button" onClick={() => location.reload()}>Tentar de novo</Button>
    </FatalScreen>
  )
}

type State = { error?: unknown; crashed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false }
  static getDerivedStateFromError(error: unknown) {
    return { error, crashed: true }
  }
  render() {
    if (!this.state.crashed) return this.props.children
    return this.state.error instanceof StorageReadError ? <ReadFailedScreen /> : <CrashScreen />
  }
}
