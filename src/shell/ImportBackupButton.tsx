import { useRef, useState } from 'react'
import { importBackupFile } from '../storage/backup'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function ImportBackupButton({ label, variant = 'ghost' }: { label: string; variant?: 'ghost' | 'row' }) {
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

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={variant === 'row' ? 'h-14 w-full justify-start rounded-[14px] border border-border bg-panel px-3.5 text-[15px] text-text' : 'text-text-2'}
        onClick={() => fileRef.current?.click()}
      >
        {label}
      </Button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { setFile(e.target.files?.[0]); e.target.value = '' }} />
      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      <AlertDialog open={!!file} onOpenChange={(o) => { if (!o) setFile(undefined) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup?</AlertDialogTitle>
            <AlertDialogDescription>Isso substitui todos os seus dados. Continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void restore()}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
