import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

/** "Usar" por cima de um plano salvo pede confirmação antes de `commit` */
export function useReplaceConfirm<T>(needsConfirm: (next: T) => boolean, commit: (next: T) => void, title: string, text: string) {
  const [replacing, setReplacing] = useState<T>()
  const offer = (next: T) => (needsConfirm(next) ? setReplacing(next) : commit(next))
  const dialog = (
    <ConfirmDialog
      open={replacing !== undefined} title={title} text={text} confirm="Substituir"
      onConfirm={() => replacing !== undefined && commit(replacing)} onCancel={() => setReplacing(undefined)}
    />
  )
  return { offer, dialog }
}
