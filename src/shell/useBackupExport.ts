import { useState } from 'react'
import { exportBackup } from '@/storage/backup'

export function useBackupExport(onError?: (message: string) => void) {
  const [error, setError] = useState<string>()
  const send = () => void exportBackup().catch((e: Error) => (onError ?? setError)(e.message))
  return { send, error }
}
