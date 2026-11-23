import { useState } from 'react'
import { toast } from 'sonner'
import type { useSelection } from '@/lib/useSelection'
import { plural } from '@/lib/number'
import { BottomBar } from '@/components/BottomBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'

type Selection = ReturnType<typeof useSelection>

export function SelectToggle({ sel }: { sel: Selection }) {
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" className="text-text-2" onClick={sel.on ? sel.stop : sel.start}>{sel.on ? 'Cancelar seleção' : 'Selecionar'}</Button>
    </div>
  )
}

/** `noun`: [singular, plural] de um substantivo masculino (o aviso diz "removidos") */
export function SelectionBar({ sel, noun: [one, many], onRemove }: { sel: Selection; noun: [string, string]; onRemove: (ids: Set<string>) => void }) {
  const [confirm, setConfirm] = useState(false)
  const n = sel.selected.size
  if (!sel.on) return null
  return (
    <>
      <BottomBar className="gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={sel.stop}>Cancelar</Button>
        <Button size="lg" className="flex-1" disabled={!n} onClick={() => setConfirm(true)}>{`Remover (${n})`}</Button>
      </BottomBar>
      <ConfirmDialog
        open={confirm}
        title={`Remover ${plural(n, one, many)}?`}
        text="Eles saem do plano. O histórico fica."
        confirm="Remover"
        destructive
        onConfirm={() => {
          onRemove(sel.selected)
          sel.stop()
          setConfirm(false)
          toast(plural(n, `${one} removido`, `${many} removidos`))
        }}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
