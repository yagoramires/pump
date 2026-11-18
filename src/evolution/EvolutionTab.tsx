import { useState, type ReactNode } from 'react'
import { CalendarDays, Camera, ChevronRight, FileText, Plus, Ruler, Share2, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import type { EvolutionInput } from './types'
import { loadPhoto } from '@/storage/photos'
import { daysBetween, formatDayMonth, todayKey } from '@/lib/date'
import { formatDec, formatKg, plural } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EmptyState } from '@/components/EmptyState'
import { IconDot } from '@/components/IconDot'
import type { Metric } from './bodyFat'
import { FAT, WEIGHT } from './measurements'
import { WeightChart } from './WeightChart'
import { MeasureDrawer } from './MeasureDrawer'
import { Delta } from './Delta'
import { PhotoThumb } from './PhotoThumb'
import { ANGLES } from './photoSets'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { AchievementIcon } from './AchievementIcon'
import { AchievementsScreen } from './AchievementsScreen'
import { HistoryScreen } from './HistoryScreen'
import { DietCard } from './DietCard'
import { CheckIn, AnamnesisCard, CheckInCard } from './CheckInFlow'
import { checkInDue } from './checkIn'
import { AnamnesisFlow } from '@/onboarding/AnamnesisFlow'
import { usePersisted } from '@/storage/db'
import { useEvolution } from './useEvolution'
import { buildReport, change } from './report'
import { generatePdf } from './pdf/generate'
import { shareFile } from '@/lib/share'

type View = 'checkin' | 'anamnesis' | 'capture' | 'compare' | 'achievements' | 'history'
const CARD = 'mb-2.5 overflow-hidden card'
const LINK = 'h-11 px-1 text-[13px] font-medium text-accent disabled:text-faint'
const RANGES = [{ v: '30', label: '30 d' }, { v: '90', label: '90 d' }, { v: 'all', label: 'Tudo' }]
const KPI: Metric[] = ['weightKg', 'fat']
function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-panel px-3 py-2.5">
      <div className="text-xs text-faint">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-strong tabular-nums">{value}</div>
      <div className="mt-px text-[13px] tabular-nums">{children}</div>
    </div>
  )
}

export function EvolutionTab() {
  const input = useEvolution()
  const [range, setRange] = useState('90')
  const [choosing, setChoosing] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [view, setView] = useState<View>()
  const [busy, setBusy] = useState(false)
  const [pdf, setPdf] = useState<{ blob: Blob; input: EvolutionInput; today: string }>()
  const [settings] = usePersisted('settings')
  const today = todayKey()
  const due = checkInDue(settings, input.measurements, today)

  if (view === 'checkin') return <CheckIn onClose={() => setView(undefined)} />
  if (view === 'anamnesis') return <AnamnesisFlow total={3} onDone={() => setView(undefined)} onBack={() => setView(undefined)} />
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

  const cards = (
    <>
      {!settings.anamnesisAt && <AnamnesisCard onStart={() => setView('anamnesis')} />}
      {due && <CheckInCard due={due} today={today} onStart={() => setView('checkin')} />}
    </>
  )

  const report = buildReport(input, today)
  const { period, training, body, lastSet } = report
  if (!training.workouts && !input.measurements.length && !input.photoSets.length && !report.hasDiet) {
    return (
      <>
        {cards}
        <EmptyState icon={<TrendingUp size={30} aria-hidden="true" />} title="Sua evolução começa aqui">
          <p className="max-w-[260px] text-sm text-text-2">Registre peso, medidas e fotos pra acompanhar.</p>
          <Button className="mt-2 w-full max-w-xs" onClick={() => setChoosing(true)}>Registrar</Button>
        </EmptyState>
        {drawers}
      </>
    )
  }

  const weights = body?.weight ?? []
  const points = weights.filter((p) => range === 'all' || daysBetween(p.date, today) <= Number(range))
  const weight = body?.rows.find((r) => r.key === 'weightKg')
  const fat = body?.rows.find((r) => r.key === 'fat')
  const rows = body?.rows.filter((r) => !KPI.includes(r.key)) ?? []
  const earned = report.achievements.filter((x) => x.earnedAt)

  const blob = pdf?.input === input && pdf.today === today ? pdf.blob : undefined
  const makePdf = async () => {
    setBusy(true)
    try {
      const ids = report.photoPairs.flatMap((p) => [p.before.id, p.after.id])
      const photos: Record<string, string> = {}
      await Promise.all(ids.map(async (id) => { const src = await loadPhoto(id); if (src) photos[id] = src }))
      setPdf({ blob: await generatePdf(report, photos), input, today })
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
      <div className="label-caps">{`Desde ${formatDayMonth(period.start)} · ${plural(period.days, 'dia', 'dias')}`}</div>
      <h1 className="mt-0.5 mb-3 text-[26px] font-bold tracking-tight text-strong">Evolução</h1>
      {cards}

      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <Kpi label={WEIGHT.label} value={weight ? `${formatKg(weight.last.value)} ${WEIGHT.unit}` : '—'}>
          <Delta value={change(weight)} good={!!weight?.good} unit={WEIGHT.unit} />
        </Kpi>
        <Kpi label={FAT.label} value={fat ? `${formatDec(fat.last.value)}${FAT.unit}` : '—'}>
          <Delta value={change(fat)} good={!!fat?.good} unit={FAT.deltaUnit} />
        </Kpi>
        <Kpi label="Treinos" value={String(training.workouts)}>
          <span className={training.workouts ? 'text-accent' : 'text-text-2'}>{training.workouts ? `${formatDec(training.perWeek, 1)}/sem` : '—'}</span>
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
        <div className="px-3.5 pb-3"><WeightChart points={points} empty={weights.length >= 2 ? 'Poucos registros nesse período' : undefined} /></div>
      </div>

      {rows.length > 0 && (
        <div className={CARD}>
          <div className="px-3.5 pt-3 pb-2 text-[15px] font-semibold text-strong">Medidas</div>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm">
              <span className="text-text-2">{r.label}</span>
              <span className="tabular-nums">
                <b className="font-semibold text-strong">{`${formatKg(r.first.value)} → ${formatKg(r.last.value)} ${r.unit}`}</b>
                <Delta value={change(r)} good={r.good} unit={r.unit} className="ml-2 text-[13px]" />
              </span>
            </div>
          ))}
        </div>
      )}

      {report.hasDiet && <DietCard log={input.dietLog} water={input.waterLog} today={today} />}

      <div className={CARD}>
        <div className="flex items-center justify-between pl-3.5 pr-2">
          <span className="text-[15px] font-semibold text-strong">Fotos</span>
          <span className="flex gap-2">
            <button type="button" className={LINK} onClick={() => setView('capture')}>Nova foto</button>
            <button type="button" className={LINK} disabled={input.photoSets.length < 2} onClick={() => setView('compare')}>Comparar</button>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {ANGLES.map((angle) => (
            <PhotoThumb key={angle} id={lastSet?.[angle]} alt={`Foto de ${angle}`} className="flex items-end justify-center rounded-[10px] pb-1.5 text-xs text-text-2">
              <span className="relative">{angle}</span>
            </PhotoThumb>
          ))}
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

      <div className="pointer-events-none fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      <div className="fixed bottom-[calc(var(--nav-h)+12px+env(safe-area-inset-bottom))] left-1/2 z-(--z-bar) flex w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2 gap-2">
        <Button variant="secondary" className="h-11 flex-1 rounded-[13px] border border-border font-bold" onClick={() => setChoosing(true)}><Plus aria-hidden="true" /> Registrar</Button>
        {blob ? (
          <Button className="h-11 flex-1 rounded-[13px] font-bold" onClick={() => shareFile(new File([blob], `pump-evolucao-${today}.pdf`, { type: 'application/pdf' })).catch(() => toast.error('Não consegui compartilhar o PDF'))}><Share2 aria-hidden="true" /> Compartilhar PDF</Button>
        ) : (
          <Button className="h-11 flex-1 rounded-[13px] font-bold" disabled={busy} onClick={() => void makePdf()}><FileText aria-hidden="true" /> {busy ? 'Gerando…' : 'Gerar PDF'}</Button>
        )}
      </div>
      {drawers}
    </div>
  )
}
