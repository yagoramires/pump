import { useState } from 'react'
import { Camera, FileText, Plus, Ruler, Share2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { EvolutionInput } from './types'
import { loadPhoto } from '@/storage/photos'
import { formatDayMonth } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { plural } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { TabHeader } from '@/components/TabHeader'
import { EmptyState } from '@/components/EmptyState'
import { fatSeries } from './measurements'
import type { Period } from './chart'
import { MeasureDrawer } from './MeasureDrawer'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { AchievementsScreen } from './AchievementsScreen'
import { HistoryScreen } from './HistoryScreen'
import { LoadsCard } from './LoadsCard'
import { ExerciseLoadScreen } from './ExerciseLoadScreen'
import { BodyCard } from './BodyCard'
import { PhotosCard } from './PhotosCard'
import { MoreList } from './MoreList'
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
  if (exerciseId) return <ExerciseLoadScreen sessions={input.sessions} exerciseId={exerciseId} period={loadPeriod} today={today} onClose={() => setExerciseId(undefined)} />

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
  const { period, training, body } = report
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

  const fat = fatSeries(input.profile, input.measurements)

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

      <BodyCard body={body} fat={fat} range={range} onRange={setRange} today={today} onRegister={() => setMeasurementDate(tick())} />

      <LoadsCard sessions={input.sessions} today={today} period={loadPeriod} onPeriod={setLoadPeriod} onOpen={setExerciseId} />

      <PhotosCard report={report} sets={input.photoSets.length} onNew={() => setPhotoDate(tick())} onCompare={() => setView('compare')} />

      <MoreList input={input} report={report} today={today} onAchievements={() => setView('achievements')} onHistory={() => setView('history')} />

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
