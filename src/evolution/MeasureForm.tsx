import { useState, type ReactNode } from 'react'
import type { Profile } from '@/profile/types'
import type { MeasureFields } from './types'
import { usePersisted } from '@/storage/db'
import { formatInput, inRange, parseDecimal } from '@/lib/number'
import { formatDayMonth } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bodyFat } from './bodyFat'
import { FIELDS, fieldsFor, formatValue, previousMeasure, upsertMeasurement, type UpsertStatus } from './measurements'
import { Optional } from '@/components/Optional'
import { Alert } from '@/components/ui/alert'
import { CM, WEIGHT_KG } from './limits'

type Key = keyof MeasureFields
const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()
const range = (k: Key): readonly [number, number] => (k === 'weightKg' ? WEIGHT_KG : CM)

export function MeasureForm({ date, profile: draft, onSaved, submitLabel = 'Salvar', needWeight, children }: { date: string; profile?: Profile; onSaved: (status: UpsertStatus) => void; submitLabel?: string; needWeight?: boolean; children?: ReactNode }) {
  const [list, setList] = usePersisted('measurements')
  const [stored] = usePersisted('profile')
  const profile = draft ?? stored
  const initial = list.find((m) => m.date === date)
  const fields = fieldsFor(profile.sex)
  const [text, setText] = useState(() =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, initial?.[key] === undefined ? '' : formatInput(initial[key])])) as Record<Key, string>,
  )
  // vazio ou 0 vira null (apaga o campo); texto inválido ou fora da faixa trava o Salvar em vez de apagar o valor salvo
  const num = (k: Key) => (text[k].trim() ? parseDecimal(text[k]) : null)
  const parsed = Object.fromEntries(fields.map(({ key }) => { const n = num(key); return [key, n !== null && n > 0 ? n : null] })) as { [K in Key]?: number | null }
  const invalid = fields.filter(({ key }) => { const n = num(key); return text[key].trim() && (n === null || (n > 0 && !inRange(n, ...range(key)))) }).map((f) => f.key)
  const fat = bodyFat(profile.sex, profile.heightCm, Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== null)))

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => {
        const { key, label, unit } = field
        const previous = previousMeasure(list, key, date)
        return (
          <Label key={key} className="justify-between gap-3 border-t border-line py-2 text-body first:border-t-0 font-normal normal-case tracking-normal">
            <span className="flex flex-col gap-1">
              <span className="font-semibold text-strong">{label}{needWeight && key !== 'weightKg' && <> <Optional /></>}</span>
              {previous && <span id={`previous-${key}`} className="text-caption text-text-2">Anterior: {formatValue(field, previous.value)} em {formatDayMonth(previous.date)}</span>}
            </span>
            <span className="relative w-30">
              <Input
                className="h-11 pr-9 font-semibold tabular-nums"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                aria-label={label}
                aria-describedby={previous ? `previous-${key}` : undefined}
                aria-invalid={invalid.includes(key) || undefined}
                value={text[key]}
                onFocus={select}
                onChange={(e) => setText((t) => ({ ...t, [key]: e.target.value }))}
              />
              <small className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-faint">{unit}</small>
            </span>
          </Label>
        )
      })}
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
