import { useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, Camera, ChevronRight, FileText, Plus, Ruler, TrendingUp, Trophy } from 'lucide-react'
import { NO_PROFILE, type MeasureFields, type Measurement, type PhotoSet, type WorkoutLog, type WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { loadPhoto } from '../storage/photos'
import { daysBetween, formatDayMonth, todayKey } from '../lib/date'
import { formatKg } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EmptyState } from '@/components/EmptyState'
import { IconDot } from '@/components/IconDot'
import { cn } from '@/lib/utils'
import { bodyFat, goalDirection } from './bodyFat'
import { firstLast } from './measurements'
import { computeAchievements } from './achievements'
import { LineChart } from './LineChart'
import { MeasureDrawer } from './MeasureDrawer'

type View = 'capture' | 'compare' | 'achievements' | 'history'
type Pt = { date: string; value: number }
const NO_MEASURES: Measurement[] = []
const NO_PHOTOS: PhotoSet[] = []
const NO_LOG: WorkoutLog = {}
const NO_PLAN: WorkoutPlan = { workouts: [] }
const LABEL = 'text-[10px] font-semibold uppercase tracking-[.05em] text-faint'
const CARD = 'mb-2.5 overflow-hidden rounded-[14px] border border-border bg-panel'
const LINK = 'h-11 px-1 text-[13px] font-medium text-accent disabled:text-faint'
const RANGES = [{ v: '30', label: '30 d' }, { v: '90', label: '90 d' }, { v: 'all', label: 'Tudo' }]
const MEASURES: { key: keyof MeasureFields; label: string }[] = [
  { key: 'neckCm', label: 'Pescoço' },
  { key: 'waistCm', label: 'Cintura' },
  { key: 'hipCm', label: 'Quadril' },
  { key: 'armCm', label: 'Braço' },
  { key: 'chestCm', label: 'Peito' },
  { key: 'thighCm', label: 'Coxa' },
]
// o que melhora ao subir (gain) ou ao descer (loss); o resto fica neutro
const GOOD = { gain: ['weightKg', 'armCm', 'chestCm', 'thighCm'], loss: ['weightKg', 'waistCm', 'hipCm'] }

const dec = (n: number, min = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: 1 })

function Delta({ d, unit, good, className }: { d?: number; unit: string; good: (d: number) => boolean; className?: string }) {
  if (d === undefined) return <span className={cn('text-text-2', className)}>—</span>
  const r = Math.round(d * 10) / 10
  return <span className={cn(r !== 0 && good(r) ? 'text-accent' : 'text-text-2', className)}>{`${r < 0 ? '−' : r > 0 ? '+' : ''}${dec(Math.abs(r))} ${unit}`}</span>
}

function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-panel px-3 py-2.5">
      <div className="text-xs text-faint">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-strong tabular-nums">{value}</div>
      <div className="mt-px text-[13px] tabular-nums">{children}</div>
    </div>
  )
}

function Thumb({ id, label }: { id?: string; label: string }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let alive = true
    if (id) loadPhoto(id).then((v) => alive && setSrc(v)).catch(() => {})
    return () => { alive = false }
  }, [id])
  return (
    <div className="relative flex aspect-[3/4] items-end justify-center overflow-hidden rounded-[10px] bg-surface pb-1.5 text-xs text-text-2">
      {src && <img src={src} alt={`Foto de ${label}`} className="absolute inset-0 size-full object-cover" />}
      <span className="relative">{label}</span>
    </div>
  )
}

export function EvolutionTab() {
  const [log, , a] = usePersisted('workoutLog', NO_LOG)
  const [plan, , b] = usePersisted('workoutPlan', NO_PLAN)
  const [measurements, , c] = usePersisted('measurements', NO_MEASURES)
  const [photoSets, , d] = usePersisted('photoSets', NO_PHOTOS)
  const [profile, , e] = usePersisted('profile', NO_PROFILE)
  const [range, setRange] = useState('90')
  const [choosing, setChoosing] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  // captura, comparação, conquistas e histórico: as telas ainda não existem
  const [, setView] = useState<View>()
  const today = todayKey()

  if (!(a && b && c && d && e)) return <p className="text-sm text-text-2">Carregando…</p>

  const drawers = (
    <>
      <Drawer open={choosing} onOpenChange={setChoosing}>
        <DrawerContent>
          <div className="px-4 pb-5">
            <DrawerTitle className="pt-1 pb-3 text-[19px] font-semibold text-strong">Registrar</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha o que registrar hoje</DrawerDescription>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-20 flex-col gap-1.5 rounded-[14px] bg-surface" onClick={() => { setChoosing(false); setMeasuring(true) }}><Ruler aria-hidden="true" className="size-5" />Medidas</Button>
              <Button variant="outline" className="h-20 flex-col gap-1.5 rounded-[14px] bg-surface" onClick={() => { setChoosing(false); setView('capture') }}><Camera aria-hidden="true" className="size-5" />Fotos</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <MeasureDrawer open={measuring} onClose={() => setMeasuring(false)} date={today} />
    </>
  )

  const ms = [...measurements].sort((x, y) => x.date.localeCompare(y.date))
  const sessions = Object.values(log).filter((s) => s.completedAt).sort((x, y) => x.date.localeCompare(y.date))
  const start = [sessions[0]?.date, ms[0]?.date, ...photoSets.map((p) => p.date)].filter((x): x is string => !!x).sort()[0]
  if (!start) {
    return (
      <>
        <EmptyState icon={<TrendingUp size={30} aria-hidden="true" />} title="Sua evolução começa aqui">
          <p className="max-w-[260px] text-sm text-text-2">Registre peso, medidas e fotos pra acompanhar.</p>
          <Button className="mt-2 w-full max-w-xs" onClick={() => setChoosing(true)}>Registrar</Button>
        </EmptyState>
        {drawers}
      </>
    )
  }

  const dir = goalDirection(profile)
  const good = (key: string) => (v: number) => (v > 0 ? GOOD.gain.includes(key) && dir === 'gain' : GOOD.loss.includes(key) && dir === 'loss')
  const diff = ({ first, last }: { first?: Pt; last?: Pt }) => (first && last && first.date !== last.date ? last.value - first.value : undefined)

  const weight = firstLast(measurements, 'weightKg')
  const fats = ms.flatMap((m) => {
    const value = bodyFat(profile.sex, profile.heightCm, m)
    return value === null ? [] : [{ date: m.date, value }]
  })
  const fat = { first: fats[0], last: fats[fats.length - 1] }
  const weeks = sessions.length ? Math.max(1, (daysBetween(sessions[0].date, today) + 1) / 7) : 1
  const points = ms
    .filter((m) => m.weightKg !== undefined && (range === 'all' || daysBetween(m.date, today) <= Number(range)))
    .map((m) => ({ date: m.date, value: m.weightKg! }))
  const rows = MEASURES.map((x) => ({ ...x, ...firstLast(measurements, x.key) })).filter((x) => x.first && x.last)
  const lastSet = [...photoSets].sort((x, y) => x.date.localeCompare(y.date)).pop()
  const earned = computeAchievements({ workoutLog: log, workoutPlan: plan, measurements, photoSets, profile }, today).filter((x) => x.earnedAt)
  const days = daysBetween(start, today)

  return (
    <div className="pb-24">
      <div className={LABEL}>{`Desde ${formatDayMonth(start)} · ${days} ${days === 1 ? 'dia' : 'dias'}`}</div>
      <h1 className="mt-0.5 mb-3 text-[26px] font-bold tracking-tight text-strong">Evolução</h1>

      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <Kpi label="Peso" value={weight.last ? `${formatKg(weight.last.value)} kg` : '—'}>
          <Delta d={diff(weight)} unit="kg" good={good('weightKg')} />
        </Kpi>
        <Kpi label="Gordura" value={fat.last ? `${dec(fat.last.value)}%` : '—'}>
          <Delta d={diff(fat)} unit="pt" good={(v) => v < 0} />
        </Kpi>
        <Kpi label="Treinos" value={String(sessions.length)}>
          <span className="text-text-2">{sessions.length ? `${dec(sessions.length / weeks, 1)}/sem` : '—'}</span>
        </Kpi>
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between pl-3.5 pr-2">
          <span className="text-[15px] font-semibold text-strong">Peso</span>
          <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v)} aria-label="Período do gráfico">
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.v} value={r.v} className="h-11 min-w-11 px-2 text-[13px] font-medium text-faint data-[state=on]:bg-transparent data-[state=on]:text-accent">{r.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="px-3.5 pb-3"><LineChart points={points} /></div>
      </div>

      {rows.length > 0 && (
        <div className={CARD}>
          <div className="px-3.5 pt-3 pb-2 text-[15px] font-semibold text-strong">Medidas</div>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm">
              <span className="text-text-2">{r.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold text-strong">{`${formatKg(r.first!.value)} → ${formatKg(r.last!.value)} cm`}</b>
                <Delta d={diff(r)} unit="cm" good={good(r.key)} className="ml-2 text-[13px]" />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={CARD}>
        <div className="flex items-center justify-between pl-3.5 pr-2">
          <span className="text-[15px] font-semibold text-strong">Fotos</span>
          <span className="flex gap-2">
            <button type="button" className={LINK} onClick={() => setView('capture')}>Nova foto</button>
            <button type="button" className={LINK} disabled={photoSets.length < 2} onClick={() => setView('compare')}>Comparar</button>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {(['frente', 'lado', 'costas'] as const).map((angle) => <Thumb key={lastSet?.[angle] ?? angle} id={lastSet?.[angle]} label={angle} />)}
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between pl-3.5 pr-2">
          <span className="text-[15px] font-semibold text-strong">Conquistas</span>
          <button type="button" className={LINK} onClick={() => setView('achievements')}>Ver todas</button>
        </div>
        <div className="flex gap-2.5 px-3.5 pb-3.5">
          {Array.from({ length: 4 }, (_, i) => earned[i]).map((x, i) =>
            x ? (
              <span key={x.id} role="img" aria-label={x.title} title={x.title} className="flex size-[60px] items-center justify-center rounded-[18px] border border-accent-line bg-accent-bg text-accent"><Trophy size={22} aria-hidden="true" /></span>
            ) : (
              <span key={i} aria-hidden="true" className="flex size-[60px] items-center justify-center rounded-[18px] border border-border bg-surface text-border-strong"><Trophy size={22} /></span>
            ),
          )}
        </div>
      </div>

      <div className={CARD}>
        <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left" onClick={() => setView('history')}>
          <IconDot size={36} color="var(--c2)"><CalendarDays size={18} aria-hidden="true" /></IconDot>
          <span className="flex-1 text-[15px] font-semibold text-strong">Histórico</span>
          <ChevronRight size={18} className="text-faint" aria-hidden="true" />
        </button>
      </div>

      <div className="pointer-events-none fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-10 flex w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2 gap-2">
        <Button variant="secondary" className="h-11 flex-1 rounded-[13px] border border-border font-bold" onClick={() => setChoosing(true)}><Plus aria-hidden="true" /> Registrar</Button>
        {/* ligado quando o PDF existir */}
        <Button className="h-11 flex-1 rounded-[13px] font-bold" disabled title="Em breve"><FileText aria-hidden="true" /> Gerar PDF</Button>
      </div>
      {drawers}
    </div>
  )
}
