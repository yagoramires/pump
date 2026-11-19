import { useState } from 'react'
import { Check, ChevronDown, ImageOff } from 'lucide-react'
import type { Angle } from './types'
import { usePersisted } from '@/storage/db'
import { formatDayMonth } from '@/lib/date'
import { formatDec, formatKg, plural, round1 } from '@/lib/number'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { goalDirection, isGood } from './bodyFat'
import { Delta } from './Delta'
import { byDate, FAT, FIELDS, WEIGHT, fatSeries, pointAt, series, type Field, type Point } from './measurements'
import { ANGLES } from './types'
import { AngleTabs } from './AngleTabs'
import { PhotoThumb } from './PhotoThumb'

const UNAVAILABLE = <div role="img" aria-label="Foto indisponível" className="absolute inset-0 flex items-center justify-center text-faint"><ImageOff size={28} aria-hidden="true" /></div>

function Pane({ id, date, now }: { id?: string; date: string; now: boolean }) {
  return (
    <PhotoThumb id={id} alt={`Foto de ${formatDayMonth(date)}`} className="rounded-card" empty={UNAVAILABLE}>
      <Badge className={cn('absolute top-2 left-2 rounded-md px-1.5 text-caption', now ? 'bg-accent font-bold text-on-accent' : 'bg-black/60 font-normal text-white')}>{formatDayMonth(date)}</Badge>
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

  const header = <BackHeader title="Comparar" onBack={onClose} />
  if (!before || !after) return <Overlay>{header}<p className="text-sm text-text-2">Nenhuma foto ainda.</p></Overlay>

  const dir = goalDirection(profile)
  const row = (f: Field, points: Point[], fmt: (n: number) => string) => ({
    label: f.label, metric: f.key, unit: f.spaced === false ? f.unit : ` ${f.unit}`, delta: f.deltaUnit ?? f.unit,
    from: pointAt(points, before.date), to: pointAt(points, after.date), fmt,
  })
  const waist = FIELDS.find((f) => f.key === 'waistCm')!
  const rows = [
    row(WEIGHT, series(ms, 'weightKg'), formatKg),
    row(waist, series(ms, 'waistCm'), formatKg),
    row(FAT, fatSeries(profile, ms), (n) => formatDec(n)),
  ]
  const shown = rows.flatMap((r) => (r.from !== undefined && r.to !== undefined ? [{ ...r, from: r.from, to: r.to, d: round1(r.to - r.from) }] : []))

  return (
    <Overlay>
      {header}
      <div className="flex flex-col gap-3">
      <AngleTabs value={angle} onChange={setAngle} />
      <div className="grid grid-cols-2 gap-2">
        <Pane id={before[angle]} date={before.date} now={before.date > after.date} />
        <Pane id={after[angle]} date={after.date} now={after.date >= before.date} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="font-normal" onClick={() => setPicking('before')}>{`Antes: ${formatDayMonth(before.date)}`}<ChevronDown size={14} aria-hidden="true" /></Button>
        <Button type="button" variant="outline" size="sm" className="border-accent bg-accent-bg font-normal text-accent hover:bg-accent-bg hover:text-accent" onClick={() => setPicking('after')}>{`Depois: ${formatDayMonth(after.date)}`}<ChevronDown size={14} aria-hidden="true" /></Button>
      </div>

      {shown.length > 0 && (
        <Card size="flush">
          {shown.map((r, k) => (
            <div key={r.metric} className={cn('flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm', k > 0 && 'border-t border-line')}>
              <span className="text-text-2">{r.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold text-strong">{`${r.fmt(r.from)} → ${r.fmt(r.to)}${r.unit}`}</b>
                <Delta value={r.d} good={isGood(r.metric, dir, r.d)} unit={r.delta} className="ml-2 text-meta" />
              </span>
            </div>
          ))}
        </Card>
      )}
      </div>

      <Drawer open={!!picking} onOpenChange={(o) => !o && setPicking(undefined)}>
        <DrawerContent>
          <div className="overflow-y-auto px-4 pb-5">
            <DrawerTitle className="pt-1 pb-3 text-title font-semibold text-strong">{picking === 'before' ? 'Antes' : 'Depois'}</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha o registro de fotos</DrawerDescription>
            {sorted.map((s) => {
              const on = s.id === (picking === 'before' ? before : after).id
              const n = ANGLES.filter((x) => s[x]).length
              return (
                <Toggle
                  key={s.id}
                  pressed={on}
                  className="h-auto min-h-11 w-full justify-between gap-3 rounded-none border-t border-line px-0 py-2 text-left text-sm font-normal"
                  onPressedChange={() => { setChosen((c) => ({ ...c, [picking!]: s.id })); setPicking(undefined) }}
                >
                  <span className="text-strong">{formatDayMonth(s.date)}</span>
                  <span className="flex items-center gap-2 text-text-2">{plural(n, 'foto', 'fotos')}{on && <Check size={16} className="text-accent" aria-hidden="true" />}</span>
                </Toggle>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </Overlay>
  )
}
