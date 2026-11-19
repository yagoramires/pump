import { useState } from 'react'
import { toast } from 'sonner'
import { exportBackup } from './backup'

/** telas com Toaster montado */
export const sendBackup = () => void exportBackup().catch((e: Error) => toast.error(e.message))

/** telas sem Toaster (erro, instalação): o erro volta para a tela mostrar */
export function useBackupExport() {
  const [error, setError] = useState<string>()
  const send = () => void exportBackup().catch((e: Error) => setError(e.message))
  return { send, error }
}
