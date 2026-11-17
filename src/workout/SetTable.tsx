import { useState } from 'react'
import { Check } from 'lucide-react'
import type { SessionExercise, SetDone } from '../types'
import { formatKg, parseDecimal } from '@/lib/number'
import { cn } from '@/lib/utils'

type Draft = { kg?: string; reps?: string }
type Props = {
  ex: SessionExercise
  prev: (SetDone | null)[]
  onCheck: (i: number, v: SetDone | null) => void
  /** série já feita: só os campos válidos que mudaram */
  onEdit: (i: number, p: Partial<SetDone>) => void
}

const TH = 'pb-1.5 text-[10px] font-semibold uppercase tracking-[.04em] text-faint'

export function SetTable({ ex, prev, onCheck, onEdit }: Props) {
  // o que foi digitado fica só na tela até marcar (ou até o blur, se a série já foi feita)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const setDraft = (i: number, p: Draft) => setDrafts((d) => ({ ...d, [i]: { ...d[i], ...p } }))
  const clearDraft = (i: number) => setDrafts((d) => ({ ...d, [i]: {} }))

  const check = (i: number) => {
    if (ex.sets[i]) return onCheck(i, null)
    const d = drafts[i] ?? {}
    onCheck(i, { reps: d.reps?.trim() || ex.reps, weightKg: parseDecimal(d.kg ?? '') ?? ex.weightKg })
    clearDraft(i)
  }
  const commit = (i: number) => {
    const d = drafts[i]
    if (!ex.sets[i] || !d) return
    const kg = parseDecimal(d.kg ?? '') // inválida: mantém a anterior
    const p: Partial<SetDone> = {}
    if (kg !== null) p.weightKg = kg
    if (d.reps?.trim()) p.reps = d.reps.trim()
    if (Object.keys(p).length) onEdit(i, p)
    clearDraft(i)
  }
  const box = (done: boolean) =>
    cn('h-11 w-16 rounded-lg text-center text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent/40', done ? 'bg-transparent text-accent' : 'bg-surface text-strong')
  const enterBlurs = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()

  return (
    <table className="w-full border-collapse tabular-nums">
      <thead>
        <tr><th className={TH}>Série</th><th className={TH}>Anterior</th><th className={TH}>kg</th><th className={TH}>Reps</th><th className={TH}><span className="sr-only">Feita</span></th></tr>
      </thead>
      <tbody>
        {ex.sets.map((s, i) => {
          const n = i + 1
          const p = prev[i]
          return (
            <tr key={i} className={cn('border-t border-line text-center', s && 'bg-accent-bg')}>
              <td className="py-1 text-sm text-text-2">{n}</td>
              <td className="py-1 text-[13px] text-faint">{p ? `${formatKg(p.weightKg)}×${p.reps}` : '—'}</td>
              <td className="py-1">
                <input
                  className={box(!!s)}
                  inputMode="decimal"
                  aria-label={`Carga da série ${n} de ${ex.name}`}
                  value={drafts[i]?.kg ?? formatKg(s ? s.weightKg : ex.weightKg)}
                  onChange={(e) => setDraft(i, { kg: e.target.value })}
                  onBlur={() => commit(i)}
                  onKeyDown={enterBlurs}
                />
              </td>
              <td className="py-1">
                <input
                  className={box(!!s)}
                  aria-label={`Reps da série ${n} de ${ex.name}`}
                  value={drafts[i]?.reps ?? (s ? s.reps : ex.reps)}
                  onChange={(e) => setDraft(i, { reps: e.target.value })}
                  onBlur={() => commit(i)}
                  onKeyDown={enterBlurs}
                />
              </td>
              <td className="py-1">
                <button type="button" aria-label={`Série ${n} de ${ex.name}`} aria-pressed={s !== null} onClick={() => check(i)} className="inline-flex size-11 items-center justify-center">
                  <span className={cn('flex size-7 items-center justify-center rounded-lg border', s ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-transparent')}>
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  </span>
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
