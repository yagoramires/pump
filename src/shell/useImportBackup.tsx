import { useRef, useState } from 'react'
import { importBackupFile } from '@/storage/backup'
import { ConfirmDialog } from '@/components/ConfirmDialog'

/** restaurar backup: quem chama desenha o botão (`pick`) e o erro, e põe `input` e `confirm` na tela */
export function useImportBackup() {
  const [error, setError] = useState<string>()
  const [file, setFile] = useState<File>()
  const fileRef = useRef<HTMLInputElement>(null)

  const restore = async () => {
    if (!file) return
    setError(undefined)
    try {
      await importBackupFile(file)
      location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar')
    }
  }

  return {
    pick: () => fileRef.current?.click(),
    error,
    input: <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { setFile(e.target.files?.[0]); e.target.value = '' }} />,
    confirm: (
      <ConfirmDialog
        open={!!file} title="Restaurar backup?" text="Isso substitui todos os seus dados. Continuar?" confirm="Restaurar" destructive
        onConfirm={() => void restore()} onCancel={() => setFile(undefined)}
      />
    ),
  }
}
