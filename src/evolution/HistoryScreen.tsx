import { useId, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Dumbbell, GlassWater, Moon, Pill, Ruler, Utensils } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { WEEKDAY_SHORT, formatDayMonth, todayKey } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { formatDec } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { Overlay } from '@/components/Overlay'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'
import { resetDay } from '@/diet/day'
import { removeWaterDay } from '@/diet/water'
import { removeSupplementDay } from '@/diet/supplements'
import { WorkoutDayLine } from '@/workout/WorkoutDayLine'
import { DietDayLine } from '@/diet/DietDayLine'
import { FIELDS, formatValue, removeMeasurement } from './measurements'
import { ANGLES } from './types'
import { hasPhoto } from './photoSets'
import { usePhotoSets } from './usePhotoSets'
import { dayRecords } from './dayRecords'
import { PhotoThumb } from './PhotoThumb'

const ROW = 'flex items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0'
const DEL = 'shrink-0 px-1 text-meta text-destructive hover:text-destructive'
const CONFIRM = {
  measures: { title: 'Apagar medidas?', text: 'As medidas deste dia somem do histórico e dos gráficos.' },
  photos: { title: 'Apagar fotos?', text: 'As fotos deste dia são apagadas do aparelho.' },
  diet: { title: 'Apagar dieta?', text: 'O que foi marcado na dieta deste dia some do histórico.' },
  water: { title: 'Apagar água?', text: 'A água registrada neste dia some do histórico.' },
  supplements: { title: 'Apagar suplementos?', text: 'Os suplementos marcados neste dia somem do histórico.' },
}

export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const [log] = usePersisted('workoutLog')
  const [measures, setMeasures] = usePersisted('measurements')
  const { sets, removeSet } = usePhotoSets()
  const [diet, setDiet] = usePersisted('dietLog')
  const [water, setWater] = usePersisted('waterLog')
  const [supLog, setSupLog] = usePersisted('supplementLog')
  const { now, today } = useToday()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [day, setDay] = useState<string | undefined>(today)
  const [confirm, setConfirm] = useState<keyof typeof CONFIRM>()
  const descId = useId()

  const y = month.getFullYear()
  const m = month.getMonth()
  const isCurrent = y === now.getFullYear() && m === now.getMonth()
  const keys = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => todayKey(new Date(y, m, i + 1)))
  const title = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const go = (n: number) => { setMonth(new Date(y, m + n, 1)); setDay(undefined) }

  const records = (k: string) => dayRecords({ workoutLog: log, dietLog: diet, waterLog: water, supplementLog: supLog, measurements: measures, photoSets: sets }, k)
  const { session: done, rest, diet: meals, water: drank, supplements: sups, measurement: measure, photos, others } = day ? records(day) : {}

  const remove = () => {
    if (!day) return
    if (confirm === 'diet') setDiet((prev) => resetDay(prev, day))
    if (confirm === 'water') setWater((prev) => removeWaterDay(prev, day))
    if (confirm === 'supplements') setSupLog((prev) => removeSupplementDay(prev, day))
    if (confirm === 'measures') setMeasures((prev) => removeMeasurement(prev, day))
    if (confirm === 'photos' && photos) removeSet(photos.id)
  }

  return (
    <Overlay>
      <BackHeader title={title} onBack={onClose} titleClassName="first-letter:uppercase">
        <Button type="button" variant="ghost" size="icon" className="text-text-2" aria-label="Mês anterior" onClick={() => go(-1)}><ChevronLeft size={20} aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" className="text-text-2 disabled:text-border-strong" aria-label="Próximo mês" disabled={isCurrent} onClick={() => go(1)}><ChevronRight size={20} aria-hidden="true" /></Button>
      </BackHeader>

      <span id={`${descId}t`} hidden>treino</span>
      <span id={`${descId}r`} hidden>com registro</span>
      <div className="flex flex-col gap-3">
      <Card size="sm" className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((w, i) => <span key={i} aria-hidden="true" className="pb-1 text-caption font-semibold text-faint">{w[0]}</span>)}
        {Array.from({ length: month.getDay() }, (_, i) => <span key={`x${i}`} />)}
        {keys.map((k, i) => {
          const r = records(k)
          const trained = !!r.session
          const dot = r.others
          return (
            <Toggle
              key={k}
              pressed={k === day}
              onPressedChange={() => setDay(k)}
              aria-current={k === today ? 'date' : undefined}
              aria-describedby={[trained && `${descId}t`, dot && `${descId}r`].filter(Boolean).join(' ') || undefined}
              className={cn(
                'relative h-11 min-w-0 rounded-lg border px-0 text-sm tabular-nums',
                trained ? 'border-accent-line bg-accent-bg font-semibold text-accent' : 'border-transparent text-text-2',
                k === today && 'shadow-[inset_0_0_0_1px_var(--color-strong)]',
                k === day && 'ring-2 ring-accent/50',
              )}
            >
              {i + 1}
              {dot && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-accent" />}
            </Toggle>
          )
        })}
      </Card>

      {day && (
        <>
          <div className="label-caps mx-0.5 pt-1">
            {done ? `${formatDayMonth(day)} · Treino ${done.workoutLabel}` : formatDayMonth(day)}
          </div>
          {!done && !others ? (
            <p className="px-0.5 text-sm text-text-2">Nada registrado neste dia.</p>
          ) : (
            <Card size="flush">
              {done && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c2)"><Dumbbell size={16} aria-hidden="true" /></IconDot>
                  <WorkoutDayLine session={done} now={now} />
                </div>
              )}
              {rest && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c2)"><Moon size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1 text-body font-semibold text-strong">Descanso</div>
                </div>
              )}
              {meals && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c1)"><Utensils size={16} aria-hidden="true" /></IconDot>
                  <DietDayLine day={meals} />
                  <Button type="button" variant="link" size="sm" className={DEL} onClick={() => setConfirm('diet')}>Apagar dieta</Button>
                </div>
              )}
              {drank && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c6)"><GlassWater size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1 text-body font-semibold text-strong tabular-nums">{`Água · ${formatDec(drank.ml / 1000)} L`}</div>
                  <Button type="button" variant="link" size="sm" className={DEL} onClick={() => setConfirm('water')}>Apagar água</Button>
                </div>
              )}
              {sups && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c4)"><Pill size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1 text-body font-semibold text-strong tabular-nums">{`Suplementos · ${sups.taken.length} de ${sups.total}`}</div>
                  <Button type="button" variant="link" size="sm" className={DEL} onClick={() => setConfirm('supplements')}>Apagar suplementos</Button>
                </div>
              )}
              {measure && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--color-accent)"><Ruler size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1">
                    <div className="text-body font-semibold text-strong">Medidas</div>
                    <div className="text-meta text-text-2 tabular-nums">
                      {FIELDS.filter((f) => measure[f.key] !== undefined).map((f) => `${f.label} ${formatValue(f, measure[f.key]!)}`).join(' · ')}
                    </div>
                  </div>
                  <Button type="button" variant="link" size="sm" className={DEL} onClick={() => setConfirm('measures')}>Apagar medidas</Button>
                </div>
              )}
              {photos && (
                <div className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <div className="flex items-center gap-3">
                    <IconDot size={32} color="var(--c4)"><Camera size={16} aria-hidden="true" /></IconDot>
                    <span className="flex-1 text-body font-semibold text-strong">Fotos</span>
                    <Button type="button" variant="link" size="sm" className={DEL} onClick={() => setConfirm('photos')}>Apagar fotos</Button>
                  </div>
                  {hasPhoto(photos) && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {ANGLES.filter((k) => photos[k]).map((k) => <PhotoThumb key={k} id={photos[k]} alt={`Foto de ${k}`} className="rounded-lg" />)}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm} title={confirm ? CONFIRM[confirm].title : ''} text={confirm ? CONFIRM[confirm].text : ''} confirm="Apagar" destructive
        onConfirm={remove} onCancel={() => setConfirm(undefined)}
      />
    </Overlay>
  )
}
