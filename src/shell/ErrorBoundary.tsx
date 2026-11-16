import { Component, useState, type ReactNode } from 'react'
import { exportBackup } from '../storage/backup'

export function FatalScreen({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <main className="stack" role="alert">
      <h1>{title}</h1>
      <p className="muted-note">{text}</p>
      {children}
    </main>
  )
}

function CrashScreen() {
  const [error, setError] = useState<string>()
  return (
    <FatalScreen title="Algo deu errado" text="Seus dados continuam salvos neste aparelho. Exporte um backup por garantia e recarregue o app.">
      <button type="button" className="btn ghost" onClick={() => exportBackup().catch((e) => setError(e instanceof Error ? e.message : 'Falha ao exportar'))}>Exportar backup</button>
      <button type="button" className="btn" onClick={() => location.reload()}>Recarregar</button>
      {error && <p>{error}</p>}
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
