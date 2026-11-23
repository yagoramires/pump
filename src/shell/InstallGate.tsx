import { useEffect, useState } from 'react'
import { Share } from 'lucide-react'
import { hasAnyData } from '@/storage/db'
import { sendBackup } from '@/backup/backup'
import { CenteredScreen } from './CenteredScreen'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

export function InstallGate({ onDismiss }: { onDismiss: () => void }) {
  const [hasData, setHasData] = useState(false)
  useEffect(() => {
    void hasAnyData().then(setHasData, () => setHasData(true)) // sem conseguir ler, ainda oferece o backup: pode funcionar
  }, [])
  return (
    <CenteredScreen>
      <EmptyState icon={<Share size={32} aria-hidden="true" />} title="Instale o Pump">
        <p className="max-w-xs text-sm text-text-2">No Safari, toque em Compartilhar → Adicionar à Tela de Início. Só assim o iPhone não apaga os seus dados.</p>
        {hasData && (
          <>
            <p className="max-w-xs text-sm text-text-2">Você já tem dados aqui. Exporte um backup para importar no app instalado.</p>
            <Button type="button" variant="secondary" className="w-full max-w-xs" onClick={sendBackup}>Exportar backup</Button>
          </>
        )}
        <p className="max-w-xs text-meta text-text-2">Os dados daqui não passam sozinhos pro app instalado.</p>
        <Button type="button" variant="link" className="text-text-2" onClick={onDismiss}>Continuar no navegador mesmo assim</Button>
      </EmptyState>
    </CenteredScreen>
  )
}
