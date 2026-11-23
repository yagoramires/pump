import { useState } from 'react'
import { Ban, Undo2 } from 'lucide-react'
import type { SessionExercise, SetDone } from './types'
import { formatInput, formatKg, parseInRange } from '@/lib/number'
import { KG } from './limits'
import { repsPerSet } from './reps'
import { suggestedKg } from './stats'
import { useFieldProps } from './useFieldProps'
import { isSkipped } from './session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Draft = { kg?: string; reps?: string }
type Props = {
  ex: SessionExercise
  prev: (SetDone | null)[]
  /** alterna a série: v é o valor se ela for marcada; marcar ou desmarcar se decide no último valor salvo */
  onCheck: (i: number, v: SetDone) => void
  /** série já feita: só os campos válidos que mudaram */
  onEdit: (i: number, p: Partial<SetDone>) => void
  /** alterna "não fiz" da série */
  onSkip: (i: number) => void
}
type Drag = { i: number; x: number; y: number; dx: number; on: boolean }

const parseKg = (v: string) => parseInRange(v, ...KG)
// desfaz os padrões do Table do shadcn que mudariam o visual da tabela de séries
const TH = 'h-auto px-2 pb-1.5 text-center text-caption font-semibold whitespace-normal text-text-2'
const TD = 'px-0 py-1.5 whitespace-normal'

export function SetTable({ ex, prev, onCheck, onEdit, onSkip }: Props) {
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [drag, setDrag] = useState<Drag>()
  const field = useFieldProps()
  const perSet = repsPerSet(ex.reps, ex.sets.length)
  const setDraft = (i: number, p: Draft) => setDrafts((d) => ({ ...d, [i]: { ...d[i], ...p } }))
  const clearDraft = (i: number) => setDrafts((d) => ({ ...d, [i]: {} }))

  const check = (i: number) => {
    const d = drafts[i] ?? {}
    onCheck(i, { reps: d.reps?.trim() || (perSet?.[i] ?? ex.reps), weightKg: parseKg(d.kg ?? '') ?? suggestedKg(ex, prev, i) })
    clearDraft(i)
  }
  const commit = (i: number) => {
    const d = drafts[i]
    if (!ex.sets[i] || !d) return
    const kg = parseKg(d.kg ?? '')
    const p: Partial<SetDone> = {}
    if (kg !== null) p.weightKg = kg
    if (d.reps?.trim()) p.reps = d.reps.trim()
    if (Object.keys(p).length) onEdit(i, p)
    clearDraft(i)
  }
  // o rascunho digitado não volta ao desfazer o pulo
  const skip = (i: number) => {
    clearDraft(i)
    onSkip(i)
  }
  const box = (done: boolean) => cn('mx-auto w-16 rounded-lg px-1 text-center font-semibold tabular-nums', done ? 'bg-transparent text-success-fg' : 'bg-surface')
  const inputProps = (i: number) => ({
    ...field,
    onBlur: () => commit(i),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur(),
  })

  // arrastar a linha pro lado (tipo apagar conversa no WhatsApp); só vira arraste quando o gesto é mais horizontal que vertical
  const rowDrag = (i: number) => ({
    // arrastar nos campos/checkbox é mexer neles (cursor, seleção), não pular a série
    onPointerDown: (e: React.PointerEvent) => {
      if (!(e.target as Element).closest('input, button, [role=checkbox]')) setDrag({ i, x: e.clientX, y: e.clientY, dx: 0, on: false })
    },
    onPointerMove: (e: React.PointerEvent<HTMLTableRowElement>) => {
      if (drag?.i !== i) return
      // nenhum botão apertado: o pointerup se perdeu fora da linha; sem isso o hover reviveria o arraste e pularia a série
      if (e.buttons === 0) return setDrag(undefined)
      const dx = e.clientX - drag.x
      const on = drag.on || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - drag.y))
      if (on && !drag.on) e.currentTarget.setPointerCapture(e.pointerId)
      setDrag({ ...drag, dx, on })
    },
    onPointerUp: (e: React.PointerEvent<HTMLTableRowElement>) => {
      if (drag?.i === i && drag.on && Math.abs(drag.dx) > e.currentTarget.offsetWidth / 3) skip(i)
      setDrag(undefined)
    },
    onPointerCancel: () => setDrag(undefined),
    // saiu da linha antes de virar arraste (sem captura): o gesto não é dela
    onPointerLeave: (e: React.PointerEvent<HTMLTableRowElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) setDrag(undefined)
    },
  })

  return (
    <Table className="touch-pan-y border-collapse tabular-nums">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow className="border-b-0 hover:bg-transparent">
          <TableHead className={TH}>Série</TableHead><TableHead className={TH}>Anterior</TableHead><TableHead className={TH}>kg</TableHead><TableHead className={TH}>Reps</TableHead><TableHead className={TH}><span className="sr-only">Feita</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border-t">
        {ex.sets.map((s, i) => {
          const n = i + 1
          const p = prev[i]
          const skipped = isSkipped(ex, i)
          return (
            <TableRow
              key={i}
              className={cn('border-t border-b-0 border-line text-center', s ? 'bg-success-bg hover:bg-success-bg' : 'hover:bg-transparent', skipped && 'line-through opacity-50')}
              style={drag?.i === i && drag.on ? { transform: `translateX(${drag.dx}px)` } : undefined}
              {...rowDrag(i)}
            >
              <TableCell className={cn(TD, 'text-sm text-text-2')}>
                {n}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="sr-only focus:not-sr-only focus:ml-1 focus:align-middle"
                  aria-label={`${skipped ? 'Desfazer pular' : 'Pular'} série ${n} de ${ex.name}`}
                  onClick={() => skip(i)}
                >
                  {skipped ? <Undo2 size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
                </Button>
              </TableCell>
              <TableCell className={cn(TD, 'text-meta text-text-2')}>{p ? `${formatKg(p.weightKg)}×${p.reps}` : '—'}</TableCell>
              <TableCell className={TD}>
                <Input
                  className={box(!!s)}
                  inputMode="decimal"
                  aria-label={`Carga da série ${n} de ${ex.name}`}
                  disabled={skipped}
                  value={drafts[i]?.kg ?? formatInput(s ? s.weightKg : suggestedKg(ex, prev, i))}
                  onChange={(e) => setDraft(i, { kg: e.target.value })}
                  {...inputProps(i)}
                />
              </TableCell>
              <TableCell className={TD}>
                <Input
                  className={box(!!s)}
                  aria-label={`Reps da série ${n} de ${ex.name}`}
                  disabled={skipped}
                  value={drafts[i]?.reps ?? (s?.reps ?? perSet?.[i] ?? ex.reps)}
                  onChange={(e) => setDraft(i, { reps: e.target.value })}
                  {...inputProps(i)}
                />
              </TableCell>
              <TableCell className={cn(TD, 'pr-3 [&:has([role=checkbox])]:pr-3 [&>[role=checkbox]]:translate-y-0')}>
                <Checkbox size="check" className="mx-auto touch-manipulation" aria-label={`Série ${n} de ${ex.name}`} checked={s !== null} onCheckedChange={() => check(i)} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
