import { useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ImageOff } from 'lucide-react'
import type { Angle } from './types'
import { usePersisted } from '../storage/db'
import { formatDayMonth } from '../lib/date'
import { formatDec, formatKg, plural, round1 } from '@/lib/number'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Overlay } from '@/components/Overlay'
import { cn } from '@/lib/utils'
import { goalDirection, isGood, type Metric } from './bodyFat'
import { Delta } from './Delta'
import { byDate, fatSeries, pointAt, series, type Point } from './measurements'
import { ANGLES } from './photoSets'
import { AngleTabs } from './AngleTabs'
import { PhotoThumb } from './PhotoThumb'

const CHIP = 'flex h-11 items-center gap-1 rounded-[10px] border border-border px-3 text-[13px] text-text'

const UNAVAILABLE = <div role="img" aria-label="Foto indisponível" className="absolute inset-0 flex items-center justify-center text-faint"><ImageOff size={28} aria-hidden="true" /></div>

function Pane({ id, date, now }: { id?: string; date: string; now: boolean }) {
  return (
    <PhotoThumb id={id} alt={`Foto de ${formatDayMonth(date)}`} className="rounded-[14px]" empty={UNAVAILABLE}>
      <span className={cn('absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[11px]', now ? 'bg-accent font-bold text-on-accent' : 'bg-black/60 text-white')}>{formatDayMonth(date)}</span>
    </PhotoThumb>
  )
}

export function PhotoCompare({ onClose }: { onClose: () => void }) {
  const [sets] = usePersisted('photoSets')
  const [ms] = usePersisted('measurements')
  const [profile] = usePersisted('profile')
  const [angle, setAngle] = useState<Angle>('frente')
  const [chosen, setChosen] = useState<{ before?: string; after?: string }>({})
  const [picking, setPicking] = useState<'before' | 'after'>()

  const sorted = byDate(sets)
  const before = sorted.find((s) => s.id === chosen.before) ?? sorted[0]
  const after = sorted.find((s) => s.id === chosen.after) ?? sorted[sorted.length - 1]

  const header = (
    <header className="flex items-center gap-3 py-2">
      <button type="button" className="icon-btn" aria-label="Voltar" onClick={onClose}><ChevronLeft size={18} /></button>
      <h1 className="flex-1 text-[19px] font-semibold text-strong">Comparar</h1>
    </header>
  )
  if (!before || !after) return <Overlay>{header}<p className="text-sm text-text-2">Nenhuma foto ainda.</p></Overlay>

  const dir = goalDirection(profile)
  const at = (points: Point[]) => ({ from: pointAt(points, before.date), to: pointAt(points, after.date) })
  const rows: { label: string; metric: Metric; unit: string; delta: string; from?: number; to?: number; fmt: (n: number) => string }[] = [
    { label: 'Peso', metric: 'weightKg', unit: ' kg', delta: 'kg', ...at(series(ms, 'weightKg')), fmt: formatKg },
    { label: 'Cintura', metric: 'waistCm', unit: ' cm', delta: 'cm', ...at(series(ms, 'waistCm')), fmt: formatKg },
    { label: 'Gordura', metric: 'fat', unit: '%', delta: 'pt', ...at(fatSeries(profile, ms)), fmt: (n) => formatDec(n) },
  ]
  const shown = rows.flatMap((r) => (r.from !== undefined && r.to !== undefined ? [{ ...r, from: r.from, to: r.to, d: round1(r.to - r.from) }] : []))

  return (
    <Overlay>
      {header}
      <div className="mt-2">
        <AngleTabs value={angle} onChange={setAngle} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pane id={before[angle]} date={before.date} now={before.date > after.date} />
        <Pane id={after[angle]} date={after.date} now={after.date >= before.date} />
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" className={CHIP} onClick={() => setPicking('before')}>{`Antes: ${formatDayMonth(before.date)}`}<ChevronDown size={14} aria-hidden="true" /></button>
        <button type="button" className={cn(CHIP, 'border-accent bg-accent-bg text-accent')} onClick={() => setPicking('after')}>{`Depois: ${formatDayMonth(after.date)}`}<ChevronDown size={14} aria-hidden="true" /></button>
      </div>

      {shown.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-[14px] border border-border bg-panel">
          {shown.map((r, k) => (
            <div key={r.metric} className={cn('flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm', k > 0 && 'border-t border-line')}>
              <span className="text-text-2">{r.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold text-strong">{`${r.fmt(r.from)} → ${r.fmt(r.to)}${r.unit}`}</b>
                <Delta value={r.d} good={isGood(r.metric, dir, r.d)} unit={r.delta} className="ml-2 text-[13px]" />
              </span>
            </div>
          ))}
        </div>
      )}

      <Drawer open={!!picking} onOpenChange={(o) => !o && setPicking(undefined)}>
        <DrawerContent>
          <div className="overflow-y-auto px-4 pb-5">
            <DrawerTitle className="pt-1 pb-3 text-[19px] font-semibold text-strong">{picking === 'before' ? 'Antes' : 'Depois'}</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha o registro de fotos</DrawerDescription>
            {sorted.map((s) => {
              const on = s.id === (picking === 'before' ? before : after).id
              const n = ANGLES.filter((x) => s[x]).length
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-line py-2 text-left text-sm"
                  onClick={() => { setChosen((c) => ({ ...c, [picking!]: s.id })); setPicking(undefined) }}
                >
                  <span className="text-strong">{formatDayMonth(s.date)}</span>
                  <span className="flex items-center gap-2 text-text-2">{plural(n, 'foto', 'fotos')}{on && <Check size={16} className="text-accent" aria-hidden="true" />}</span>
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </Overlay>
  )
}
