import { useState } from 'react'
import { Ban, Undo2 } from 'lucide-react'
import type { SessionExercise, SetDone } from './types'
import { formatInput, formatKg, parseInRange } from '@/lib/number'
import { KG } from './limits'
import { repsPerSet } from './reps'
import { suggestedKg } from './stats'
import { useFieldProps } from './useFieldProps'
import { isSkipped } from './session'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
const TH = 'label-caps px-2 pb-1.5'

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
  const box = (done: boolean) => cn('mx-auto w-16 rounded-lg px-1 text-center font-semibold tabular-nums', done ? 'bg-transparent text-accent' : 'bg-surface')
  const inputProps = (i: number) => ({
    ...field,
    onBlur: () => commit(i),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur(),
  })

  // arrastar a linha pro lado (tipo apagar conversa no WhatsApp); só vira arraste quando o gesto é mais horizontal que vertical
  const rowDrag = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => setDrag({ i, x: e.clientX, y: e.clientY, dx: 0, on: false }),
    onPointerMove: (e: React.PointerEvent<HTMLTableRowElement>) => {
      if (drag?.i !== i) return
      const dx = e.clientX - drag.x
      const on = drag.on || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - drag.y))
      if (on && !drag.on) e.currentTarget.setPointerCapture(e.pointerId)
      setDrag({ ...drag, dx, on })
    },
    onPointerUp: (e: React.PointerEvent<HTMLTableRowElement>) => {
      if (drag?.i === i && drag.on && Math.abs(drag.dx) > e.currentTarget.offsetWidth / 3) onSkip(i)
      setDrag(undefined)
    },
    onPointerCancel: () => setDrag(undefined),
  })

  return (
    <table className="w-full border-collapse tabular-nums">
      <thead>
        <tr><th className={TH}>Série</th><th className={TH}>Anterior</th><th className={TH}>kg</th><th className={TH}>Reps</th><th className={TH}><span className="sr-only">Feita</span></th></tr>
      </thead>
      <tbody>
        {ex.sets.map((s, i) => {
          const n = i + 1
          const p = prev[i]
          const skipped = isSkipped(ex, i)
          return (
            <tr
              key={i}
              className={cn('touch-pan-y border-t border-line text-center', s && 'bg-accent-bg', skipped && 'line-through opacity-50')}
              style={drag?.i === i && drag.on ? { transform: `translateX(${drag.dx}px)` } : undefined}
              {...rowDrag(i)}
            >
              <td className="py-1.5 text-sm text-text-2">
                {n}
                <button
                  type="button"
                  className="sr-only rounded-md focus:not-sr-only focus:ml-1 focus:inline-flex focus:p-1 focus:align-middle"
                  aria-label={`${skipped ? 'Desfazer pular' : 'Pular'} série ${n} de ${ex.name}`}
                  onClick={() => onSkip(i)}
                >
                  {skipped ? <Undo2 size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
                </button>
              </td>
              <td className="py-1.5 text-meta text-faint">{p ? `${formatKg(p.weightKg)}×${p.reps}` : '—'}</td>
              <td className="py-1.5">
                <Input
                  className={box(!!s)}
                  inputMode="decimal"
                  aria-label={`Carga da série ${n} de ${ex.name}`}
                  disabled={skipped}
                  value={drafts[i]?.kg ?? formatInput(s ? s.weightKg : suggestedKg(ex, prev, i))}
                  onChange={(e) => setDraft(i, { kg: e.target.value })}
                  {...inputProps(i)}
                />
              </td>
              <td className="py-1.5">
                <Input
                  className={box(!!s)}
                  aria-label={`Reps da série ${n} de ${ex.name}`}
                  disabled={skipped}
                  value={drafts[i]?.reps ?? (s?.reps ?? perSet?.[i] ?? ex.reps)}
                  onChange={(e) => setDraft(i, { reps: e.target.value })}
                  {...inputProps(i)}
                />
              </td>
              <td className="py-1.5 pr-3">
                <Checkbox size="check" className="mx-auto touch-manipulation" aria-label={`Série ${n} de ${ex.name}`} checked={s !== null} onCheckedChange={() => check(i)} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
