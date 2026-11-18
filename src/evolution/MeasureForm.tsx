import { useState, type ReactNode } from 'react'
import type { Profile } from '@/profile/types'
import type { MeasureFields } from './types'
import { usePersisted } from '@/storage/db'
import { formatInput, parseDecimal } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { bodyFat } from './bodyFat'
import { FIELDS, upsertMeasurement, type UpsertStatus } from './measurements'

type Key = keyof MeasureFields
const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()

/** Registro do dia: lê e grava as medidas sozinho. `profile` só é passado quando o perfil ainda é um rascunho (dia zero) */
export function MeasureForm({ date, profile: draft, onSaved, submitLabel = 'Salvar', needWeight, children }: { date: string; profile?: Profile; onSaved: (status: UpsertStatus) => void; submitLabel?: string; needWeight?: boolean; children?: ReactNode }) {
  const [list, setList] = usePersisted('measurements')
  const [stored] = usePersisted('profile')
  const profile = draft ?? stored
  const initial = list.find((m) => m.date === date)
  const fields = FIELDS.filter((f) => f.key !== 'hipCm' || profile.sex === 'F')
  const [text, setText] = useState(() =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, initial?.[key] === undefined ? '' : formatInput(initial[key])])) as Record<Key, string>,
  )
  // vazio ou 0 vira null (apaga o campo); texto inválido trava o Salvar em vez de apagar o valor salvo
  const num = (k: Key) => (text[k].trim() ? parseDecimal(text[k]) : null)
  const parsed = Object.fromEntries(fields.map(({ key }) => { const n = num(key); return [key, n !== null && n > 0 ? n : null] })) as { [K in Key]?: number | null }
  const invalid = fields.filter(({ key }) => text[key].trim() && num(key) === null).map((f) => f.key)
  const fat = bodyFat(profile.sex, profile.heightCm, Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== null)))

  return (
    <>
      {fields.map(({ key, label, unit }) => (
        <label key={key} className="flex items-center justify-between gap-3 border-t border-line py-2">
          <span className="text-sm text-text-2">{label}</span>
          <span className="flex h-11 w-[120px] items-center rounded-[11px] border border-border bg-surface pr-3 focus-within:ring-2 focus-within:ring-accent/40 has-[[aria-invalid]]:border-negative">
            <input
              className="h-full min-w-0 flex-1 bg-transparent pl-3 text-base font-semibold tabular-nums text-strong outline-none"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              aria-label={label}
              aria-invalid={invalid.includes(key) || undefined}
              value={text[key]}
              onFocus={select}
              onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
            />
            <small className="text-xs text-faint">{unit}</small>
          </span>
        </label>
      ))}
      <div className="mt-2 flex items-center justify-between rounded-[11px] border border-border bg-surface px-3 py-2.5 text-[13px] text-text-2">
        <span>% de gordura (estimativa)</span>
        <b className={fat === null ? 'text-text-2' : 'text-accent'}>{fat === null ? '—' : `${formatInput(fat)}%`}</b>
      </div>
      {children}
      <Button className="mt-3 h-11 w-full rounded-[13px] font-bold" disabled={invalid.length > 0 || (needWeight && !parsed.weightKg)} onClick={() => {
        const { list: next, status } = upsertMeasurement(list, date, parsed)
        if (status !== 'same') setList(next)
        onSaved(status)
      }}>{submitLabel}</Button>
    </>
  )
}
