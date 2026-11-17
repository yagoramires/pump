import { Component, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { exportBackup } from '../storage/backup'

export function FatalScreen({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <EmptyState icon={<AlertTriangle size={30} aria-hidden="true" />} title={title} tone="negative">
        <p className="max-w-[300px] text-sm text-text-2">{text}</p>
        <div className="mt-3 flex w-full max-w-xs flex-col gap-2">{children}</div>
      </EmptyState>
    </main>
  )
}

function CrashScreen() {
  const [error, setError] = useState<string>()
  return (
    <FatalScreen title="Algo deu errado" text="Seus dados continuam salvos neste aparelho. Exporte um backup por garantia e recarregue o app.">
      <Button type="button" variant="secondary" onClick={() => exportBackup().catch((e) => setError(e instanceof Error ? e.message : 'Falha ao exportar'))}>Exportar backup</Button>
      <Button type="button" onClick={() => location.reload()}>Recarregar</Button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </FatalScreen>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  render() {
    return this.state.crashed ? <CrashScreen /> : this.props.children
  }
}
