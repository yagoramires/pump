import { useState, type ReactNode } from 'react'
import { CalendarDays, Camera, ChevronRight, FileText, Plus, Ruler, Share2, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { EMPTY_DIET, NO_PROFILE, type DietLog, type MeasureFields, type Measurement, type PhotoSet, type WaterLog, type WorkoutLog, type WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { loadPhoto } from '../storage/photos'
import { daysBetween, formatDayMonth, todayKey } from '../lib/date'
import { formatDec, formatKg } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EmptyState } from '@/components/EmptyState'
import { IconDot } from '@/components/IconDot'
import { goalDirection } from './bodyFat'
import { firstLast } from './measurements'
import { computeAchievements } from './achievements'
import { LineChart } from './LineChart'
import { MeasureDrawer } from './MeasureDrawer'
import { Delta } from './Delta'
import { usePhoto } from './usePhoto'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { AchievementIcon, AchievementsScreen } from './AchievementsScreen'
import { HistoryScreen } from './HistoryScreen'
import { DietCard } from './DietCard'
import { buildReport } from './report'
import { generatePdf, sharePdf } from './pdf/generate'

type View = 'capture' | 'compare' | 'achievements' | 'history'
type Pt = { date: string; value: number }
const NO_MEASURES: Measurement[] = []
const NO_PHOTOS: PhotoSet[] = []
const NO_LOG: WorkoutLog = {}
const NO_PLAN: WorkoutPlan = { workouts: [] }
const NO_DIET_LOG: DietLog = {}
const NO_WATER: WaterLog = {}
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
  const src = usePhoto(id)
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
  const [dietLog, , f] = usePersisted('dietLog', NO_DIET_LOG)
  const [waterLog, , g] = usePersisted('waterLog', NO_WATER)
  const [dietPlan, , h] = usePersisted('dietPlan', EMPTY_DIET)
  const [range, setRange] = useState('90')
  const [choosing, setChoosing] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [view, setView] = useState<View>()
  const [busy, setBusy] = useState(false)
  const [pdf, setPdf] = useState<{ blob: Blob; deps: unknown[] }>()
  const today = todayKey()

  if (!(a && b && c && d && e && f && g && h)) return <p className="text-sm text-text-2">Carregando…</p>
  if (view === 'capture') return <PhotoCapture date={today} onClose={() => setView(undefined)} />
  if (view === 'compare') return <PhotoCompare onClose={() => setView(undefined)} />
  if (view === 'achievements') return <AchievementsScreen onClose={() => setView(undefined)} />
  if (view === 'history') return <HistoryScreen onClose={() => setView(undefined)} />

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

  // mesmos números do PDF: a aba lê do relatório em vez de recalcular
  const input = { workoutLog: log, workoutPlan: plan, measurements, photoSets, profile, dietLog, waterLog, dietPlan }
  const report = buildReport(input, today)
  const { period, summary, training } = report
  const hasDiet = dietPlan.menus.length > 0 || Object.keys(dietLog).length > 0
  if (!summary.workouts && !measurements.length && !photoSets.length && !hasDiet) {
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
  const diff = ({ first, last }: { first?: Pt; last?: Pt }) => (first && last && first.date !== last.date ? last.value - first.value : undefined)

  const weights = report.body?.weight ?? []
  const points = weights.filter((p) => range === 'all' || daysBetween(p.date, today) <= Number(range))
  const rows = MEASURES.map((x) => ({ ...x, ...firstLast(measurements, x.key) })).filter((x) => x.first && x.last)
  const lastSet = [...photoSets].sort((x, y) => x.date.localeCompare(y.date)).pop()
  const earned = computeAchievements(input, today).filter((x) => x.earnedAt)

  // PDF pronto só vale pros dados de quando foi gerado: qualquer registro novo volta pra "Gerar PDF"
  const deps = [log, plan, measurements, photoSets, profile, dietLog, waterLog, dietPlan, today]
  const blob = pdf?.deps.every((x, i) => x === deps[i]) ? pdf.blob : undefined
  const makePdf = async () => {
    setBusy(true)
    try {
      const ids = report.photoPairs.flatMap((p) => [p.before.id, p.after.id])
      const photos: Record<string, string> = {}
      await Promise.all(ids.map(async (id) => { const src = await loadPhoto(id); if (src) photos[id] = src }))
      setPdf({ blob: await generatePdf(report, photos), deps })
    } catch (e) {
      console.error(e)
      // o react-pdf é baixado na hora: sem rede o import dinâmico falha
      const offline = !navigator.onLine || /dynamically imported module|module script failed|Loading chunk/i.test(e instanceof Error ? e.message : '')
      toast.error(offline ? 'Sem internet pra gerar o PDF. Conecte e tente de novo.' : 'Não consegui gerar o PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-24">
      <div className={LABEL}>{`Desde ${formatDayMonth(period.start)} · ${period.days} ${period.days === 1 ? 'dia' : 'dias'}`}</div>
      <h1 className="mt-0.5 mb-3 text-[26px] font-bold tracking-tight text-strong">Evolução</h1>

      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <Kpi label="Peso" value={summary.weight !== undefined ? `${formatKg(summary.weight)} kg` : '—'}>
          <Delta d={summary.weightDelta} unit="kg" metric="weightKg" dir={dir} />
        </Kpi>
        <Kpi label="Gordura" value={summary.fat !== undefined ? `${formatDec(summary.fat)}%` : '—'}>
          <Delta d={summary.fatDelta} unit="pt" metric="fat" dir={dir} />
        </Kpi>
        <Kpi label="Treinos" value={String(summary.workouts)}>
          <span className={summary.workouts ? 'text-accent' : 'text-text-2'}>{summary.workouts ? `${formatDec(training.perWeek, 1)}/sem` : '—'}</span>
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
        <div className="px-3.5 pb-3"><LineChart points={points} empty={weights.length >= 2 ? 'Poucos registros nesse período' : undefined} /></div>
      </div>

      {rows.length > 0 && (
        <div className={CARD}>
          <div className="px-3.5 pt-3 pb-2 text-[15px] font-semibold text-strong">Medidas</div>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm">
              <span className="text-text-2">{r.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold text-strong">{`${formatKg(r.first!.value)} → ${formatKg(r.last!.value)} cm`}</b>
                <Delta d={diff(r)} unit="cm" metric={r.key} dir={dir} className="ml-2 text-[13px]" />
              </span>
            </div>
          ))}
        </div>
      )}

      {hasDiet && <DietCard log={dietLog} water={waterLog} today={today} />}

      <div className={CARD}>
        <div className="flex items-center justify-between pl-3.5 pr-2">
          <span className="text-[15px] font-semibold text-strong">Fotos</span>
          <span className="flex gap-2">
            <button type="button" className={LINK} onClick={() => setView('capture')}>Nova foto</button>
            <button type="button" className={LINK} disabled={photoSets.length < 2} onClick={() => setView('compare')}>Comparar</button>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {(['frente', 'lado', 'costas'] as const).map((angle) => <Thumb key={angle} id={lastSet?.[angle]} label={angle} />)}
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
              <span key={x.id} role="img" aria-label={x.title} title={x.title} className="flex size-[60px] items-center justify-center rounded-[18px] border border-accent-line bg-accent-bg text-accent"><AchievementIcon id={x.id} /></span>
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
        {blob ? (
          <Button className="h-11 flex-1 rounded-[13px] font-bold" onClick={() => sharePdf(blob, `pump-evolucao-${today}.pdf`).catch(() => toast.error('Não consegui compartilhar o PDF'))}><Share2 aria-hidden="true" /> Compartilhar PDF</Button>
        ) : (
          <Button className="h-11 flex-1 rounded-[13px] font-bold" disabled={busy} onClick={() => void makePdf()}><FileText aria-hidden="true" /> {busy ? 'Gerando…' : 'Gerar PDF'}</Button>
        )}
      </div>
      {drawers}
    </div>
  )
}
