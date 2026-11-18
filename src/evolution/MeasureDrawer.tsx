import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Profile } from '@/profile/types'
import type { MeasureFields, Measurement } from './types'
import { usePersisted } from '@/storage/db'
import { formatDayMonth, todayKey } from '@/lib/date'
import { formatInput, parseDecimal } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { bodyFat } from './bodyFat'
import { FIELDS, upsertMeasurement } from './measurements'

type Key = keyof MeasureFields
const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()

export function MeasureDrawer({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const [list, setList] = usePersisted('measurements')
  const [profile] = usePersisted('profile')

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="overflow-y-auto px-4 pb-5">
          <div className="flex items-center justify-between gap-2 pt-1 pb-2">
            <DrawerTitle className="text-[19px] font-semibold text-strong">Registrar · {formatDayMonth(date)}</DrawerTitle>
            {date === todayKey() && <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-text-2">hoje</span>}
          </div>
          <DrawerDescription className="sr-only">Peso e medidas do dia</DrawerDescription>
          <MeasureForm
            profile={profile}
            initial={list.find((m) => m.date === date)}
            onSave={(fields) => {
              onClose()
              const { list: next, status } = upsertMeasurement(list, date, fields)
              if (status === 'same') return void toast('Nada mudou')
              setList(next)
              toast(status === 'saved' ? 'Medidas salvas' : 'Medidas apagadas')
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export function MeasureForm({ profile, initial, onSave, submitLabel = 'Salvar', needWeight, children }: { profile: Profile; initial?: Measurement; onSave: (f: { [K in Key]?: number | null }) => void; submitLabel?: string; needWeight?: boolean; children?: ReactNode }) {
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
      <Button className="mt-3 h-11 w-full rounded-[13px] font-bold" disabled={invalid.length > 0 || (needWeight && !parsed.weightKg)} onClick={() => onSave(parsed)}>{submitLabel}</Button>
    </>
  )
}
