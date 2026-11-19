import { useState, type ReactNode } from 'react'
import { CalendarDays, Camera, ChevronRight, FileText, Plus, Ruler, Share2, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import type { EvolutionInput } from './types'
import { loadPhoto } from '@/storage/photos'
import { formatDayMonth } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { formatDec, plural } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { TabHeader } from '@/components/TabHeader'
import { EmptyState } from '@/components/EmptyState'
import { IconDot } from '@/components/IconDot'
import type { Metric } from './goal'
import { FAT, WEIGHT, deltaUnit, formatValue } from './measurements'
import { BodyRowLine } from './BodyRowLine'
import { LineChart } from './LineChart'
import { PERIODS, inPeriod, type Period } from './chart'
import { PeriodTabs } from './PeriodTabs'
import { MeasureDrawer } from './MeasureDrawer'
import { Delta } from './Delta'
import { PhotoThumb } from './PhotoThumb'
import { ANGLES, ANGLE_LABEL } from './types'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { AchievementIcon } from './AchievementIcon'
import { AchievementsScreen } from './AchievementsScreen'
import { HistoryScreen } from './HistoryScreen'
import { LoadsCard } from './LoadsCard'
import { ExerciseLoadScreen } from './ExerciseLoadScreen'
import { DietCard } from './DietCard'
import { CheckInFlow, CheckInCard } from './CheckInFlow'
import { AnamnesisCard } from '@/profile/AnamnesisCard'
import { useCheckIn } from './useCheckIn'
import { Overlay } from '@/components/Overlay'
import { AnamnesisFlow } from '@/profile/AnamnesisFlow'
import { DayZero } from './DayZero'
import { useEvolution } from './useEvolution'
import { buildReport } from './report'
import { generatePdf } from './pdf/generate'
import { shareFile } from '@/lib/share'

type View = 'checkin' | 'anamnesis' | 'compare' | 'achievements' | 'history'
const LINK = 'text-meta text-accent disabled:text-faint'
const KPI: Metric[] = [WEIGHT.key, FAT.key]
function Kpi({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <Card size="sm" className="min-w-0 gap-0.5">
      <div className="text-xs text-faint">{label}</div>
      <div className="text-lg font-semibold text-strong tabular-nums">{value}</div>
      <div className="text-meta tabular-nums">{children}</div>
    </Card>
  )
}

export function EvolutionTab() {
  const input = useEvolution()
  const [range, setRange] = useState<Period>('90')
  const [loadPeriod, setLoadPeriod] = useState<Period>('90')
  const [exerciseId, setExerciseId] = useState<string>()
  const [choosing, setChoosing] = useState(false)
  const [measurementDate, setMeasurementDate] = useState<string>()
  const [photoDate, setPhotoDate] = useState<string>()
  const [view, setView] = useState<View>()
  const [busy, setBusy] = useState(false)
  const [pdf, setPdf] = useState<{ blob: Blob; input: EvolutionInput; today: string }>()
  const { today, tick } = useToday()
  const { due } = useCheckIn()

  if (view === 'checkin') return <CheckInFlow onClose={() => setView(undefined)} />
  if (view === 'anamnesis') return <Overlay><AnamnesisFlow DayZero={DayZero} onDone={() => setView(undefined)} onCancel={() => setView(undefined)} /></Overlay>
  if (photoDate) return <PhotoCapture date={photoDate} onClose={() => setPhotoDate(undefined)} />
  if (view === 'compare') return <PhotoCompare onClose={() => setView(undefined)} />
  if (view === 'achievements') return <AchievementsScreen onClose={() => setView(undefined)} />
  if (view === 'history') return <HistoryScreen onClose={() => setView(undefined)} />
  if (exerciseId) return <ExerciseLoadScreen log={input.workoutLog} exerciseId={exerciseId} period={loadPeriod} today={today} onClose={() => setExerciseId(undefined)} />

  const drawers = (
    <>
      <Drawer open={choosing} onOpenChange={setChoosing}>
        <DrawerContent>
          <div className="flex flex-col gap-3 px-4 pb-5">
            <DrawerTitle className="pt-1 text-title font-semibold text-strong">Registrar</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha o que registrar hoje</DrawerDescription>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-20 flex-col gap-1.5 bg-surface" onClick={() => { setChoosing(false); setMeasurementDate(tick()) }}><Ruler aria-hidden="true" className="size-5" />Medidas</Button>
              <Button variant="outline" className="h-20 flex-col gap-1.5 bg-surface" onClick={() => { setChoosing(false); setPhotoDate(tick()) }}><Camera aria-hidden="true" className="size-5" />Fotos</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {measurementDate && <MeasureDrawer onClose={() => setMeasurementDate(undefined)} date={measurementDate} />}
    </>
  )

  const cards = (
    <>
      <AnamnesisCard onStart={() => setView('anamnesis')} />
      {due && <CheckInCard due={due} today={today} onStart={() => setView('checkin')} />}
    </>
  )

  const report = buildReport(input, today)
  const { period, training, body, lastSet } = report
  if (!training.workouts && !input.measurements.length && !input.photoSets.length && !report.hasDiet) {
    return (
      <div className="flex flex-col gap-2.5">
        <TabHeader eyebrow="Evolução" />
        {cards}
        <EmptyState icon={<TrendingUp size={30} aria-hidden="true" />} title="Sua evolução começa aqui">
          <p className="max-w-64 text-sm text-text-2">Registre peso, medidas e fotos pra acompanhar.</p>
          <Button className="w-full max-w-xs" onClick={() => setChoosing(true)}>Registrar</Button>
        </EmptyState>
        {drawers}
      </div>
    )
  }

  const weights = body?.weight ?? []
  const points = weights.filter((p) => inPeriod(range, p.date, today))
  const weight = body?.rows.find((r) => r.key === WEIGHT.key)
  const fat = body?.rows.find((r) => r.key === FAT.key)
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
    <div className="flex flex-col gap-2.5 pb-24">
      <TabHeader eyebrow={`Desde ${formatDayMonth(period.start)} · ${plural(period.days, 'dia', 'dias')}`} title="Evolução" />
      {cards}

      <div className="grid grid-cols-3 gap-2">
        <Kpi label={WEIGHT.label} value={weight ? formatValue(WEIGHT, weight.last.value) : '—'}>
          <Delta value={weight?.delta} good={!!weight?.good} unit={deltaUnit(WEIGHT)} />
        </Kpi>
        <Kpi label={FAT.label} value={fat ? formatValue(FAT, fat.last.value) : '—'}>
          <Delta value={fat?.delta} good={!!fat?.good} unit={deltaUnit(FAT)} />
        </Kpi>
        <Kpi label="Treinos" value={String(training.workouts)}>
          <span className={training.workouts ? 'text-accent' : 'text-text-2'}>{training.workouts ? `${formatDec(training.perWeek, 1)}/sem` : '—'}</span>
        </Kpi>
      </div>

      <Card size="flush">
        <CardHeader>
          <CardTitle>Peso</CardTitle>
          <CardAction>
            <PeriodTabs value={range} onChange={setRange} options={PERIODS} label="Período do gráfico" />
          </CardAction>
        </CardHeader>
        <div className="px-3.5 pb-3"><LineChart points={points} label="Gráfico de peso" empty={weights.length >= 2 ? 'Poucos registros nesse período' : 'Registre mais um peso pra ver o gráfico'} /></div>
      </Card>

      <LoadsCard log={input.workoutLog} today={today} period={loadPeriod} onPeriod={setLoadPeriod} onOpen={setExerciseId} />

      {rows.length > 0 && (
        <Card size="flush">
          <CardHeader className="pt-3 pb-2"><CardTitle>Medidas</CardTitle></CardHeader>
          {rows.map((r) => <BodyRowLine key={r.key} row={r} />)}
        </Card>
      )}

      {report.hasDiet && <DietCard log={input.dietLog} water={input.waterLog} today={today} />}

      <Card size="flush">
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
          <CardAction className="flex gap-4">
            <Button type="button" variant="link" className={LINK} onClick={() => setPhotoDate(tick())}>Nova foto</Button>
            <Button type="button" variant="link" className={LINK} disabled={input.photoSets.length < 2} onClick={() => setView('compare')}>Comparar</Button>
          </CardAction>
        </CardHeader>
        <div className="grid grid-cols-3 gap-2 px-3.5 pb-3.5">
          {ANGLES.map((angle) => (
            <PhotoThumb key={angle} id={lastSet?.[angle]} alt={`Foto de ${angle}`} className="flex items-end justify-center rounded-lg pb-1.5 text-xs text-text-2">
              <span className="relative">{ANGLE_LABEL[angle]}</span>
            </PhotoThumb>
          ))}
        </div>
      </Card>

      <Card size="flush">
        <div className="flex min-h-11 items-center justify-between pl-3.5 pr-2">
          <span className="text-body font-semibold text-strong">Conquistas</span>
          <Button type="button" variant="link" className={LINK} onClick={() => setView('achievements')}>Ver todas</Button>
        </div>
        <div className="flex gap-2.5 px-3.5 pb-3.5">
          {Array.from({ length: 4 }, (_, i) => earned[i]).map((x, i) =>
            x ? (
              <span key={x.id} role="img" aria-label={x.title} title={x.title} className="flex size-15 items-center justify-center rounded-2xl border border-accent-line bg-accent-bg text-accent"><AchievementIcon id={x.id} /></span>
            ) : (
              <span key={i} aria-hidden="true" className="flex size-15 items-center justify-center rounded-2xl border border-border bg-surface text-border-strong"><Trophy size={22} /></span>
            ),
          )}
        </div>
      </Card>

      <Card size="flush">
        <Button type="button" variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3.5 py-2 text-left" onClick={() => setView('history')}>
          <IconDot size={36} color="var(--c2)"><CalendarDays size={18} aria-hidden="true" /></IconDot>
          <span className="flex-1 text-body font-semibold text-strong">Histórico</span>
          <ChevronRight size={18} className="text-faint" aria-hidden="true" />
        </Button>
      </Card>

      <div className="pointer-events-none fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] left-1/2 h-24 w-full max-w-md -translate-x-1/2 bg-linear-to-b from-transparent to-bg to-60%" />
      <div className="fixed bottom-[calc(var(--nav-h)+12px+env(safe-area-inset-bottom))] left-1/2 z-(--z-bar) flex w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] -translate-x-1/2 gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setChoosing(true)}><Plus aria-hidden="true" /> Registrar</Button>
        {blob ? (
          <Button className="flex-1" onClick={() => shareFile(new File([blob], `pump-evolucao-${today}.pdf`, { type: 'application/pdf' })).catch(() => toast.error('Não consegui compartilhar o PDF'))}><Share2 aria-hidden="true" /> Compartilhar PDF</Button>
        ) : (
          <Button className="flex-1" disabled={busy} onClick={() => void makePdf()}><FileText aria-hidden="true" /> {busy ? 'Gerando…' : 'Gerar PDF'}</Button>
        )}
      </div>
      {drawers}
    </div>
  )
}
