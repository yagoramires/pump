import { useEffect, useState } from 'react'
import { allData } from '../storage/db'
import { exportBackup } from '../storage/backup'

export function InstallGate({ onDismiss }: { onDismiss: () => void }) {
  const [hasData, setHasData] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    void allData().then((d) => setHasData(Object.keys(d).length > 0)).catch(() => {})
  }, [])
  return (
    <main>
      <h1>Instale o Pump</h1>
      <p>No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Só assim o iPhone não apaga os seus dados.</p>
      {hasData && (
        <>
          <p>Você já tem dados aqui. Exporte um backup para importar no app instalado.</p>
          <button type="button" className="btn ghost" onClick={() => exportBackup().catch((e) => setError(e instanceof Error ? e.message : 'Falha ao exportar'))}>Exportar backup</button>
          {error && <p role="alert">{error}</p>}
        </>
      )}
      <p className="muted-note">Os dados daqui não passam sozinhos pro app instalado.</p>
      <button type="button" className="btn ghost" onClick={onDismiss}>Continuar no navegador mesmo assim</button>
    </main>
  )
}
