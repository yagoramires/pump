import { useState } from 'react'
import { usePersisted } from '@/storage/db'
import { WEEKDAY_LONG, formatDayMonth, todayKey, weekday } from '@/lib/date'
import { formatKg, formatSigned, plural } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BackHeader } from '@/components/BackHeader'
import { Overlay } from '@/components/Overlay'
import { MeasureForm } from './MeasureForm'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { Delta } from './Delta'
import { weekSummary } from './checkIn'
import { usePhotoSets } from './photoSets'
import { ANGLES } from './types'

type Step = 'measure' | 'photos' | 'summary' | 'compare'

export function CheckInFlow({ onClose }: { onClose: () => void }) {
  const [today] = useState(todayKey) // fixa o dia: virar a meia-noite no fluxo não pode esvaziar o resumo
  const [list] = usePersisted('measurements')
  const [profile] = usePersisted('profile')
  const { sets } = usePhotoSets()
  const [step, setStep] = useState<Step>('measure')

  const s = weekSummary(profile, list, sets, today)

  if (step === 'photos') return <PhotoCapture date={today} onClose={() => setStep('summary')} />
  if (step === 'compare') return <PhotoCompare onClose={() => setStep('summary')} />
  if (step === 'measure') {
    return (
      <Overlay>
        <BackHeader title="Atualizar semana" onBack={onClose} />
        <MeasureForm date={today} needWeight submitLabel="Continuar" onSaved={() => setStep('photos')} />
      </Overlay>
    )
  }
  if (!s) return null
  return (
    <Overlay><div className="flex flex-col gap-3">
      <BackHeader title={`Semana ${s.week}`} onBack={onClose} />
      <Card className="gap-2 p-4">
        {s.sincePrev === undefined ? (
          <div className="text-[28px] font-semibold text-strong tabular-nums">{`${formatKg(s.weight)} kg`}</div>
        ) : (
          <>
            <div className={cn('text-[28px] font-semibold tabular-nums', s.weightGood ? 'text-accent' : 'text-strong')}>{`${formatSigned(s.sincePrev)} kg`}</div>
            <div className="text-[13px] text-text-2">{`${s.prevIsLastWeek ? 'desde a semana passada' : `desde ${formatDayMonth(s.prevDate!)}`} · ${formatKg(s.weight)} kg`}</div>
          </>
        )}
        {s.rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-2">
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-2">{r.label}</span>
              <Delta value={r.delta} good={r.good} unit={r.unit} />
            </div>
          </div>
        ))}
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-2">Fotos · {s.photos} de {ANGLES.length}</span>
        </div>
        {s.sinceStart !== undefined && (
          <p className="text-[13px] text-text-2">{`Desde o dia zero: ${formatSigned(s.sinceStart)} kg em ${plural(s.week, 'semana', 'semanas')}.`}</p>
        )}
      </Card>
      <div className="grid gap-2">
        <Button onClick={onClose}>Pronto</Button>
        <Button variant="outline" onClick={() => setStep('compare')}>Comparar fotos</Button>
      </div>
    </div></Overlay>
  )
}

export function CheckInCard({ due, today, onStart }: { due: string; today: string; onStart: () => void }) {
  const dia = WEEKDAY_LONG[weekday(due)]
  return (
    <Card className="gap-2 border-accent p-4">
      <h2 className="text-[15px] font-semibold text-strong">Atualizar semana</h2>
      <p className="text-[13px] text-text-2">{`${due === today ? 'Hoje é' : 'Era'} ${dia}, seu dia de atualizar.`}</p>
      <Button className="w-full" onClick={onStart}>Atualizar</Button>
    </Card>
  )
}
