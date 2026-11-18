import { useState } from 'react'
import { exportBackup } from '@/storage/backup'

/** exportBackup já rejeita com a mensagem em pt-BR; sem onError ela fica em `error` pra tela mostrar */
export function useBackupExport(onError?: (message: string) => void) {
  const [error, setError] = useState<string>()
  const send = () => void exportBackup().catch((e: Error) => (onError ?? setError)(e.message))
  return { send, error }
}
