import { useState, type ReactNode } from 'react'
import type { Profile } from '@/profile/types'
import type { MeasureFields } from './types'
import { usePersisted } from '@/storage/db'
import { formatInput, parseDecimal } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bodyFat } from './bodyFat'
import { FIELDS, upsertMeasurement, type UpsertStatus } from './measurements'
import { Alert } from '@/components/ui/alert'

type Key = keyof MeasureFields
const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()

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
    <div className="flex flex-col gap-2">
      {fields.map(({ key, label, unit }) => (
        <Label key={key} className="justify-between gap-3 border-t border-line pt-2 text-sm first:border-t-0 first:pt-0 font-normal normal-case tracking-normal text-text-2">
          {label}
          <span className="relative w-30">
            <Input
              className="pr-9 font-semibold tabular-nums"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              aria-label={label}
              aria-invalid={invalid.includes(key) || undefined}
              value={text[key]}
              onFocus={select}
              onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
            />
            <small className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-faint">{unit}</small>
          </span>
        </Label>
      ))}
      <Alert role="note" className="flex items-center justify-between">
        <span>% de gordura (estimativa)</span>
        <b className={fat === null ? 'text-text-2' : 'text-accent'}>{fat === null ? '—' : `${formatInput(fat)}%`}</b>
      </Alert>
      {children}
      <Button className="w-full" disabled={invalid.length > 0 || (needWeight && !parsed.weightKg)} onClick={() => {
        const { list: next, status } = upsertMeasurement(list, date, parsed)
        if (status !== 'same') setList(next)
        onSaved(status)
      }}>{submitLabel}</Button>
    </div>
  )
}
