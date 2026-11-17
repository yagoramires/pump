import { useId, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Dumbbell, GlassWater, Moon, Ruler, Utensils } from 'lucide-react'
import { DEFAULTS } from '../schema'
import { usePersisted } from '../storage/db'
import { deletePhotos } from '../storage/photos'
import { formatDayMonth, todayKey } from '../lib/date'
import { formatDec, formatKg } from '@/lib/number'
import { Overlay } from '@/components/Overlay'
import { IconDot } from '@/components/IconDot'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { sessionStats } from '../workout/stats'
import { daySummary, touched } from '../diet/day'
import { FIELDS, upsertMeasurement } from './measurements'
import { removeSet } from './photoSets'
import { usePhoto } from './usePhoto'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const ROW = 'flex items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0'
const DEL = 'h-11 shrink-0 px-1 text-[13px] font-medium text-destructive'
const CONFIRM = {
  measures: { title: 'Apagar medidas?', text: 'As medidas deste dia somem do histórico e dos gráficos.' },
  photos: { title: 'Apagar fotos?', text: 'As fotos deste dia são apagadas do aparelho.' },
  diet: { title: 'Apagar dieta?', text: 'O que foi marcado na dieta deste dia some do histórico.' },
  water: { title: 'Apagar água?', text: 'A água registrada neste dia some do histórico.' },
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const without = <T,>(log: Record<string, T>, key: string) => {
  const { [key]: _gone, ...rest } = log
  return rest
}

function Thumb({ id, label }: { id: string; label: string }) {
  const src = usePhoto(id)
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-[10px] bg-surface">
      {src && <img src={src} alt={`Foto de ${label}`} className="size-full object-cover" />}
    </div>
  )
}

export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const [log, , a] = usePersisted('workoutLog', DEFAULTS.workoutLog)
  const [measures, setMeasures, b] = usePersisted('measurements', DEFAULTS.measurements)
  const [sets, setSets, c] = usePersisted('photoSets', DEFAULTS.photoSets)
  const [diet, setDiet, dl] = usePersisted('dietLog', DEFAULTS.dietLog)
  const [water, setWater, wl] = usePersisted('waterLog', DEFAULTS.waterLog)
  const [now] = useState(() => new Date()) // fixo enquanto a tela está aberta
  const today = todayKey(now)
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

  const session = day ? log[day] : undefined
  const done = session?.completedAt ? session : undefined
  const rest = session?.rest && !done
  // cópia do dia aberta sem nada marcado não é registro
  const meals = day && diet[day] && touched(diet[day]) ? diet[day] : undefined
  const ml = (day && water[day]?.ml) || 0
  const measure = measures.find((x) => x.date === day)
  const photos = sets.find((x) => x.date === day)
  const photoIds = photos ? (['frente', 'lado', 'costas'] as const).filter((k) => photos[k]) : []

  const remove = () => {
    if (!day) return
    if (confirm === 'diet') setDiet((prev) => without(prev, day))
    if (confirm === 'water') setWater((prev) => without(prev, day))
    if (confirm === 'measures') setMeasures((prev) => upsertMeasurement(prev, day, Object.fromEntries(FIELDS.map((f) => [f.key, null]))))
    if (confirm === 'photos' && photos) {
      // o updater roda na hora (usePersisted): ids já vem preenchido na linha seguinte
      let ids: string[] = []
      setSets((prev) => {
        const r = removeSet(prev, photos.id)
        ids = r.photoIds
        return r.sets
      })
      // falhar aqui só deixa as fotos órfãs no banco; o registro já sumiu
      void deletePhotos(ids).catch(() => {})
    }
  }

  return (
    <Overlay>
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onClose}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong first-letter:uppercase">{title}</h1>
        <button type="button" className="flex size-11 items-center justify-center text-text-2" aria-label="Mês anterior" onClick={() => go(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
        {/* nada se registra no futuro: para no mês atual */}
        <button type="button" className="flex size-11 items-center justify-center text-text-2 disabled:text-border-strong" aria-label="Próximo mês" disabled={isCurrent} onClick={() => go(1)}><ChevronRight size={20} aria-hidden="true" /></button>
      </header>

      {!(a && b && c && dl && wl) ? (
        <p className="mt-3 text-sm text-text-2">Carregando…</p>
      ) : (
        <>
          {/* o nome do botão fica só o número; o estado do dia vai na descrição */}
          <span id={`${descId}t`} hidden>treino</span>
          <span id={`${descId}r`} hidden>com registro</span>
          <div className="mt-2 grid grid-cols-7 gap-1 rounded-[14px] border border-border bg-panel p-2.5 text-center">
            {WEEK.map((w, i) => <span key={i} aria-hidden="true" className="pb-1 text-[11px] font-semibold text-faint">{w}</span>)}
            {Array.from({ length: month.getDay() }, (_, i) => <span key={`x${i}`} />)}
            {keys.map((k, i) => {
              const trained = !!log[k]?.completedAt
              const dot = !!log[k]?.rest || measures.some((x) => x.date === k) || sets.some((x) => x.date === k) || (!!diet[k] && touched(diet[k])) || (water[k]?.ml ?? 0) > 0
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
              <div className="mx-0.5 mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-[.05em] text-faint">
                {done ? `${formatDayMonth(day)} · Treino ${done.workoutLabel}` : formatDayMonth(day)}
              </div>
              {!done && !rest && !meals && !ml && !measure && !photos ? (
                <p className="px-0.5 text-sm text-text-2">Nada registrado neste dia.</p>
              ) : (
                <div className="overflow-hidden rounded-[14px] border border-border bg-panel">
                  {done && (() => {
                    const s = sessionStats(done, now)
                    return (
                      <div className={ROW}>
                        <IconDot size={32} color="var(--c2)"><Dumbbell size={16} aria-hidden="true" /></IconDot>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-strong">{done.workoutName}</div>
                          <div className="text-[13px] text-text-2 tabular-nums">{[`${s.done} séries`, `${formatKg(s.volumeKg)} kg`, s.minutes !== null && `${s.minutes} min`].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                    )
                  })()}
                  {rest && (
                    <div className={ROW}>
                      <IconDot size={32} color="var(--c2)"><Moon size={16} aria-hidden="true" /></IconDot>
                      <div className="min-w-0 flex-1 text-[15px] font-semibold text-strong">Descanso</div>
                    </div>
                  )}
                  {meals && (() => {
                    const s = daySummary(meals)
                    const sub = [
                      meals.menuName,
                      !s.dayFree && `${s.mealsDone} de ${s.mealsTotal} refeições`,
                      s.swaps > 0 && plural(s.swaps, 'troca', 'trocas'),
                      s.extras > 0 && plural(s.extras, 'extra', 'extras'),
                      !s.dayFree && s.free > 0 && plural(s.free, 'refeição livre', 'refeições livres'),
                    ]
                    return (
                      <div className={ROW}>
                        <IconDot size={32} color="var(--c1)"><Utensils size={16} aria-hidden="true" /></IconDot>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-semibold text-strong">{s.dayFree ? 'Dieta · Dia livre' : `Dieta · ${formatDec(s.kcal)} kcal`}</div>
                          <div className="text-[13px] text-text-2 tabular-nums">{sub.filter(Boolean).join(' · ')}</div>
                        </div>
                        <button type="button" className={DEL} onClick={() => setConfirm('diet')}>Apagar dieta</button>
                      </div>
                    )
                  })()}
                  {ml > 0 && (
                    <div className={ROW}>
                      <IconDot size={32} color="var(--c6)"><GlassWater size={16} aria-hidden="true" /></IconDot>
                      <div className="min-w-0 flex-1 text-[15px] font-semibold text-strong tabular-nums">{`Água · ${formatDec(ml / 1000)} L`}</div>
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
                      {photoIds.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {photoIds.map((k) => <Thumb key={k} id={photos[k]!} label={k} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm && CONFIRM[confirm].title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm && CONFIRM[confirm].text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Overlay>
  )
}
