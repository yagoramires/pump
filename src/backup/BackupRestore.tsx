import { useId, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { importBackupFile } from './backup'

export function BackupRestore({ trigger }: { trigger: (pick: () => void) => ReactNode }) {
  const [error, setError] = useState<string>()
  const [file, setFile] = useState<File>()
  const inputId = useId()

  const restore = async () => {
    if (!file) return
    setError(undefined)
    try {
      await importBackupFile(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar')
    }
  }

  return (
    <>
      {trigger(() => document.getElementById(inputId)?.click())}
      <input id={inputId} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { setFile(e.target.files?.[0]); e.target.value = '' }} />
      {error && <p role="alert" className="px-3.5 py-2 text-sm text-negative">{error}</p>}
      <ConfirmDialog
        open={!!file} title="Restaurar backup?" text="Isso substitui todos os seus dados. Continuar?" confirm="Restaurar" destructive
        onConfirm={() => void restore()} onCancel={() => setFile(undefined)}
      />
    </>
  )
}
