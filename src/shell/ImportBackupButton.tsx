import { useRef, useState } from 'react'
import { importBackupFile } from '../storage/backup'

export function ImportBackupButton({ label }: { label: string }) {
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file?: File) => {
    if (!file || !confirm('Isso substitui todos os seus dados. Continuar?')) return
    setError(undefined)
    try {
      await importBackupFile(file)
      location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao importar')
    }
  }

  return (
    <>
      <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>{label}</button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
      {error && <p role="alert">{error}</p>}
    </>
  )
}
