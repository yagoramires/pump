import { useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { SessionExercise, SetDone } from './types'
import { formatInput, formatKg, parseInRange } from '@/lib/number'
import { MAX_KG } from './limits'
import { cn } from '@/lib/utils'

type Draft = { kg?: string; reps?: string }
type Props = {
  ex: SessionExercise
  prev: (SetDone | null)[]
  /** alterna a série: v é o valor se ela for marcada; marcar ou desmarcar se decide no último valor salvo */
  onCheck: (i: number, v: SetDone) => void
  /** série já feita: só os campos válidos que mudaram */
  onEdit: (i: number, p: Partial<SetDone>) => void
}

const parseKg = (v: string) => parseInRange(v, 0, MAX_KG)
const TH = 'label-caps pb-1.5 tracking-[.04em]'

export function SetTable({ ex, prev, onCheck, onEdit }: Props) {
  // o que foi digitado fica só na tela até marcar (ou até o blur, se a série já foi feita)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const typed = useRef(false)
  const setDraft = (i: number, p: Draft) => { typed.current = true; setDrafts((d) => ({ ...d, [i]: { ...d[i], ...p } })) }
  const clearDraft = (i: number) => setDrafts((d) => ({ ...d, [i]: {} }))

  const check = (i: number) => {
    const d = drafts[i] ?? {}
    onCheck(i, { reps: d.reps?.trim() || ex.reps, weightKg: parseKg(d.kg ?? '') ?? ex.weightKg })
    clearDraft(i)
  }
  const commit = (i: number) => {
    const d = drafts[i]
    if (!ex.sets[i] || !d) return
    const kg = parseKg(d.kg ?? '') // inválida: mantém a anterior
    const p: Partial<SetDone> = {}
    if (kg !== null) p.weightKg = kg
    if (d.reps?.trim()) p.reps = d.reps.trim()
    if (Object.keys(p).length) onEdit(i, p)
    clearDraft(i)
  }
  const box = (done: boolean) =>
    cn('h-11 w-16 rounded-lg text-center text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent/40', done ? 'bg-transparent text-accent' : 'bg-surface text-strong')
  const inputProps = (i: number) => ({
    autoComplete: 'off',
    enterKeyHint: 'done' as const,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      const t = e.currentTarget
      typed.current = false
      t.select()
      // iOS reposiciona o cursor após o foco; só reaplica se ainda não digitaram
      requestAnimationFrame(() => typed.current || t.setSelectionRange(0, t.value.length))
    },
    onBlur: () => commit(i),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur(),
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
          return (
            <tr key={i} className={cn('border-t border-line text-center', s && 'bg-accent-bg')}>
              <td className="py-1 text-sm text-text-2">{n}</td>
              <td className="py-1 text-[13px] text-faint">{p ? `${formatKg(p.weightKg)}×${p.reps}` : '—'}</td>
              <td className="py-1">
                <input
                  className={box(!!s)}
                  inputMode="decimal"
                  aria-label={`Carga da série ${n} de ${ex.name}`}
                  value={drafts[i]?.kg ?? formatInput(s ? s.weightKg : ex.weightKg)}
                  onChange={(e) => setDraft(i, { kg: e.target.value })}
                  {...inputProps(i)}
                />
              </td>
              <td className="py-1">
                <input
                  className={box(!!s)}
                  aria-label={`Reps da série ${n} de ${ex.name}`}
                  value={drafts[i]?.reps ?? (s ? s.reps : ex.reps)}
                  onChange={(e) => setDraft(i, { reps: e.target.value })}
                  {...inputProps(i)}
                />
              </td>
              <td className="py-1">
                <button type="button" aria-label={`Série ${n} de ${ex.name}`} aria-pressed={s !== null} onClick={() => check(i)} className="inline-flex size-11 touch-manipulation items-center justify-center">
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
