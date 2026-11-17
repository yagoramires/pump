import { useRef, useState } from 'react'
import { ChevronRight, Upload } from 'lucide-react'
import { IconDot } from '@/components/IconDot'
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
      {variant === 'row' ? (
        <button type="button" className="flex min-h-14 w-full items-center gap-3 border-t border-line px-3.5 text-left" onClick={() => fileRef.current?.click()}>
          <IconDot size={36} color="var(--c5)"><Upload size={18} aria-hidden="true" /></IconDot>
          <span className="flex-1 text-[15px] font-semibold text-strong">{label}</span>
          <ChevronRight size={18} className="text-faint" aria-hidden="true" />
        </button>
      ) : (
        <Button type="button" variant="ghost" className="text-text-2" onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden="true" />{label}</Button>
      )}
      <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de backup" onChange={(e) => { setFile(e.target.files?.[0]); e.target.value = '' }} />
      {/* order-last/basis-full: numa linha flex-wrap (montagem) o erro desce para baixo dos botões */}
      {error && <p role="alert" className="order-last basis-full px-3.5 py-2 text-sm text-negative">{error}</p>}
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
