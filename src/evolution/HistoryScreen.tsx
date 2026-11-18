import { useId, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Dumbbell, GlassWater, Moon, Ruler, Utensils } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { WEEKDAY_SHORT, formatDayMonth, todayKey } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { formatDec, formatKg } from '@/lib/number'
import { Overlay } from '@/components/Overlay'
import { IconDot } from '@/components/IconDot'
import { BackHeader } from '@/components/BackHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn, omitKey } from '@/lib/utils'
import { WorkoutDayLine } from '@/workout/WorkoutDayLine'
import { DietDayLine } from '@/diet/DietDayLine'
import { FIELDS, removeMeasurement } from './measurements'
import { ANGLES, hasPhoto, usePhotoSets } from './photoSets'
import { dayRecords } from './dayRecords'
import { PhotoThumb } from './PhotoThumb'

const ROW = 'flex items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0'
const DEL = 'h-11 shrink-0 px-1 text-[13px] font-medium text-destructive'
const CONFIRM = {
  measures: { title: 'Apagar medidas?', text: 'As medidas deste dia somem do histórico e dos gráficos.' },
  photos: { title: 'Apagar fotos?', text: 'As fotos deste dia são apagadas do aparelho.' },
  diet: { title: 'Apagar dieta?', text: 'O que foi marcado na dieta deste dia some do histórico.' },
  water: { title: 'Apagar água?', text: 'A água registrada neste dia some do histórico.' },
}

export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const [log] = usePersisted('workoutLog')
  const [measures, setMeasures] = usePersisted('measurements')
  const { sets, removeSet } = usePhotoSets()
  const [diet, setDiet] = usePersisted('dietLog')
  const [water, setWater] = usePersisted('waterLog')
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

  const records = (k: string) => dayRecords({ workoutLog: log, dietLog: diet, waterLog: water, measurements: measures, photoSets: sets }, k)
  const { session: done, rest, diet: meals, water: drank, measurement: measure, photos } = day ? records(day) : {}

  const remove = () => {
    if (!day) return
    if (confirm === 'diet') setDiet((prev) => omitKey(prev, day))
    if (confirm === 'water') setWater((prev) => omitKey(prev, day))
    if (confirm === 'measures') setMeasures((prev) => removeMeasurement(prev, day))
    if (confirm === 'photos' && photos) removeSet(photos.id)
  }

  return (
    <Overlay>
      <BackHeader title={title} onBack={onClose} titleClassName="first-letter:uppercase">
        <button type="button" className="flex size-11 items-center justify-center text-text-2" aria-label="Mês anterior" onClick={() => go(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" className="flex size-11 items-center justify-center text-text-2 disabled:text-border-strong" aria-label="Próximo mês" disabled={isCurrent} onClick={() => go(1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </BackHeader>

      <span id={`${descId}t`} hidden>treino</span>
      <span id={`${descId}r`} hidden>com registro</span>
      <div className="mt-2 grid grid-cols-7 gap-1 card p-2.5 text-center">
        {WEEKDAY_SHORT.map((w, i) => <span key={i} aria-hidden="true" className="pb-1 text-[11px] font-semibold text-faint">{w[0]}</span>)}
        {Array.from({ length: month.getDay() }, (_, i) => <span key={`x${i}`} />)}
        {keys.map((k, i) => {
          const r = records(k)
          const trained = !!r.session
          const dot = r.rest || !!(r.diet || r.water || r.measurement || r.photos)
          return (
            <button
              key={k}
              type="button"
              aria-pressed={k === day}
              aria-current={k === today ? 'date' : undefined}
              aria-describedby={[trained && `${descId}t`, dot && `${descId}r`].filter(Boolean).join(' ') || undefined}
              className={cn(
                'relative flex h-11 items-center justify-center rounded-[10px] border text-sm tabular-nums',
                trained ? 'border-accent-line bg-accent-bg font-semibold text-accent' : 'border-transparent text-text-2',
                k === today && 'shadow-[inset_0_0_0_1px_var(--color-strong)]',
                k === day && 'ring-2 ring-accent/50',
              )}
              onClick={() => setDay(k)}
            >
              {i + 1}
              {dot && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>

      {day && (
        <>
          <div className="label-caps mx-0.5 mt-4 mb-1.5">
            {done ? `${formatDayMonth(day)} · Treino ${done.workoutLabel}` : formatDayMonth(day)}
          </div>
          {!done && !rest && !meals && !drank && !measure && !photos ? (
            <p className="px-0.5 text-sm text-text-2">Nada registrado neste dia.</p>
          ) : (
            <div className="overflow-hidden card">
              {done && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c2)"><Dumbbell size={16} aria-hidden="true" /></IconDot>
                  <WorkoutDayLine session={done} now={now} />
                </div>
              )}
              {rest && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c2)"><Moon size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1 text-[15px] font-semibold text-strong">Descanso</div>
                </div>
              )}
              {meals && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c1)"><Utensils size={16} aria-hidden="true" /></IconDot>
                  <DietDayLine day={meals} />
                  <button type="button" className={DEL} onClick={() => setConfirm('diet')}>Apagar dieta</button>
                </div>
              )}
              {drank && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--c6)"><GlassWater size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1 text-[15px] font-semibold text-strong tabular-nums">{`Água · ${formatDec(drank.ml / 1000)} L`}</div>
                  <button type="button" className={DEL} onClick={() => setConfirm('water')}>Apagar água</button>
                </div>
              )}
              {measure && (
                <div className={ROW}>
                  <IconDot size={32} color="var(--color-accent)"><Ruler size={16} aria-hidden="true" /></IconDot>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-strong">Medidas</div>
                    <div className="text-[13px] text-text-2 tabular-nums">
                      {FIELDS.filter((f) => measure[f.key] !== undefined).map((f) => `${f.label} ${formatKg(measure[f.key]!)} ${f.unit}`).join(' · ')}
                    </div>
                  </div>
                  <button type="button" className={DEL} onClick={() => setConfirm('measures')}>Apagar medidas</button>
                </div>
              )}
              {photos && (
                <div className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <div className="flex items-center gap-3">
                    <IconDot size={32} color="var(--c4)"><Camera size={16} aria-hidden="true" /></IconDot>
                    <span className="flex-1 text-[15px] font-semibold text-strong">Fotos</span>
                    <button type="button" className={DEL} onClick={() => setConfirm('photos')}>Apagar fotos</button>
                  </div>
                  {hasPhoto(photos) && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ANGLES.filter((k) => photos[k]).map((k) => <PhotoThumb key={k} id={photos[k]} alt={`Foto de ${k}`} className="rounded-[10px]" />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </>
        )}

      <ConfirmDialog
        open={!!confirm} title={confirm ? CONFIRM[confirm].title : ''} text={confirm ? CONFIRM[confirm].text : ''} confirm="Apagar" destructive
        onConfirm={remove} onCancel={() => setConfirm(undefined)}
      />
    </Overlay>
  )
}
