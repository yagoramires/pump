import { useEffect, useState } from 'react'
import { Share } from 'lucide-react'
import { allData } from '@/storage/db'
import { useBackupExport } from './useBackupExport'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

export function InstallGate({ onDismiss }: { onDismiss: () => void }) {
  const [hasData, setHasData] = useState(false)
  const { send, error } = useBackupExport()
  useEffect(() => {
    void allData().then((d) => setHasData(Object.keys(d).length > 0)).catch(() => {})
  }, [])
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <EmptyState icon={<Share size={32} aria-hidden="true" />} title="Instale o Pump">
        <p className="max-w-xs text-sm text-text-2">No Safari, toque em Compartilhar → Adicionar à Tela de Início. Só assim o iPhone não apaga os seus dados.</p>
        {hasData && (
          <>
            <p className="max-w-xs text-sm text-text-2">Você já tem dados aqui. Exporte um backup para importar no app instalado.</p>
            <Button type="button" variant="secondary" className="w-full max-w-xs" onClick={send}>Exportar backup</Button>
            {error && <p role="alert" className="text-sm text-negative">{error}</p>}
          </>
        )}
        <p className="max-w-xs text-xs text-faint">Os dados daqui não passam sozinhos pro app instalado.</p>
        <Button type="button" variant="ghost" className="text-text-2" onClick={onDismiss}>Continuar no navegador mesmo assim</Button>
      </EmptyState>
    </main>
  )
}
