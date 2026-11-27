import { useState } from 'react'
import { Check, ChevronDown, ImageOff } from 'lucide-react'
import { ANGLES, ANGLE_LABEL, type Angle, type PhotoSet } from './types'
import { usePersisted } from '@/storage/db'
import { formatDayMonth } from '@/lib/date'
import { plural } from '@/lib/number'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Overlay } from '@/components/Overlay'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { BodyRowLine } from './BodyRowLine'
import { FAT, WAIST, WEIGHT, bodyRows, byDate, pointAt } from './measurements'
import { photoCount } from './photoSets'
import { AngleTabs } from './AngleTabs'
import { PhotoThumb } from './PhotoThumb'

const UNAVAILABLE = <div role="img" aria-label="Foto indisponível" className="absolute inset-0 flex items-center justify-center text-faint"><ImageOff size={28} aria-hidden="true" /></div>

function Pane({ set, angle, now }: { set: PhotoSet; angle: Angle; now: boolean }) {
  return (
    <PhotoThumb id={set[angle]} alt={`${formatDayMonth(set.date)} · ${ANGLE_LABEL[angle]}`} className="rounded-card" empty={UNAVAILABLE} set={set} zoom>
      <Badge className={cn('absolute top-2 left-2 rounded-lg px-1.5 text-caption', now ? 'bg-accent font-bold text-on-accent' : 'bg-raised font-normal text-strong')}>{formatDayMonth(set.date)}</Badge>
    </PhotoThumb>
  )
}

export function PhotoCompare({ initialId, onClose }: { initialId?: string; onClose: () => void }) {
  const [sets] = usePersisted('photoSets')
  const [ms] = usePersisted('measurements')
  const [profile] = usePersisted('profile')
  const [pickedAngle, setAngle] = useState<Angle>()
  const [chosen, setChosen] = useState<{ before?: string; after?: string }>(() =>
    initialId === byDate(sets)[0]?.id ? { before: initialId } : { after: initialId })
  const [picking, setPicking] = useState<'before' | 'after'>()

  const sorted = byDate(sets)
  const before = sorted.find((s) => s.id === chosen.before) ?? sorted[0]
  const after = sorted.find((s) => s.id === chosen.after) ?? sorted[sorted.length - 1]

  const header = <BackHeader title="Comparar fotos" onBack={onClose} />
  if (!before || !after) return <Overlay>{header}<p className="text-sm text-text-2">Nenhuma foto ainda.</p></Overlay>

  const angle = pickedAngle ?? ANGLES.find((a) => before[a] && after[a]) ?? 'frente'
  const rows = bodyRows(profile, ms, [WEIGHT, WAIST, FAT], (points) => [pointAt(points, before.date), pointAt(points, after.date)])

  return (
    <Overlay>
      {header}
      <div className="flex flex-col gap-3">
      <AngleTabs value={angle} onChange={setAngle} />
      <div className="grid grid-cols-2 gap-2">
        <Pane set={before} angle={angle} now={false} />
        <Pane set={after} angle={angle} now />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1 font-normal" onClick={() => setPicking('before')}>{`Antes: ${formatDayMonth(before.date)}`}<ChevronDown size={14} aria-hidden="true" /></Button>
        <Button type="button" variant="outline" className="h-11 flex-1 border-accent bg-accent-bg font-normal text-accent hover:bg-accent-bg hover:text-accent" onClick={() => setPicking('after')}>{`Depois: ${formatDayMonth(after.date)}`}<ChevronDown size={14} aria-hidden="true" /></Button>
      </div>

      {rows.length > 0 && (
        <Card size="flush">
          {rows.map((r) => <BodyRowLine key={r.key} row={r} />)}
        </Card>
      )}
      </div>

      <Drawer open={!!picking} onOpenChange={(o) => !o && setPicking(undefined)}>
        <DrawerContent>
          <div className="overflow-y-auto px-4 pb-5">
            <DrawerTitle className="pt-1 pb-3 text-title font-semibold text-strong">{picking === 'before' ? 'Antes' : 'Depois'}</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha o registro de fotos</DrawerDescription>
            {sorted.filter((s) => picking === 'before' ? s.date < after.date : s.date > before.date).map((s) => {
              const on = s.id === (picking === 'before' ? before : after).id
              return (
                <Toggle
                  key={s.id}
                  pressed={on}
                  className="h-auto min-h-11 w-full justify-between gap-3 rounded-none border-t border-line px-0 py-2 text-left text-sm font-normal"
                  onPressedChange={() => { if (picking) setChosen((c) => ({ ...c, [picking]: s.id })); setAngle(undefined); setPicking(undefined) }}
                >
                  <span className="flex items-center gap-3">
                    <PhotoThumb id={s[angle]} alt="" className="w-9 shrink-0 rounded-md" />
                    <span className="text-strong">{formatDayMonth(s.date)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-text-2">{plural(photoCount(s), 'foto', 'fotos')}{on && <Check size={16} className="text-accent" aria-hidden="true" />}</span>
                </Toggle>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </Overlay>
  )
}
