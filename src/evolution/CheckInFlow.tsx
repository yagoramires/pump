import { useState } from 'react'
import { usePersisted } from '@/storage/db'
import { WEEKDAY_LONG, formatDayMonth, todayKey, weekday } from '@/lib/date'
import { formatKg, formatSigned, plural } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BackHeader } from '@/components/BackHeader'
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
      <>
        <BackHeader title="Atualizar semana" onBack={onClose} />
        <MeasureForm date={today} needWeight submitLabel="Continuar" onSaved={() => setStep('photos')} />
      </>
    )
  }
  if (!s) return null
  return (
    <div>
      <BackHeader title={`Semana ${s.week}`} onBack={onClose} />
      <div className="card mt-3 p-4">
        {s.sincePrev === undefined ? (
          <div className="text-[28px] font-semibold text-strong tabular-nums">{`${formatKg(s.weight)} kg`}</div>
        ) : (
          <>
            <div className={cn('text-[28px] font-semibold tabular-nums', s.weightGood ? 'text-accent' : 'text-strong')}>{`${formatSigned(s.sincePrev)} kg`}</div>
            <div className="text-[13px] text-text-2">{`${s.prevIsLastWeek ? 'desde a semana passada' : `desde ${formatDayMonth(s.prevDate!)}`} · ${formatKg(s.weight)} kg`}</div>
          </>
        )}
        {s.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-t border-line py-2 text-sm">
            <span className="text-text-2">{r.label}</span>
            <Delta value={r.delta} good={r.good} unit={r.unit} />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line py-2 text-sm">
          <span className="text-text-2">Fotos · {s.photos} de {ANGLES.length}</span>
        </div>
        {s.sinceStart !== undefined && (
          <p className="text-[13px] text-text-2">{`Desde o dia zero: ${formatSigned(s.sinceStart)} kg em ${plural(s.week, 'semana', 'semanas')}.`}</p>
        )}
      </div>
      <div className="mt-4 grid gap-2">
        <Button onClick={onClose}>Pronto</Button>
        <Button variant="outline" onClick={() => setStep('compare')}>Comparar fotos</Button>
      </div>
    </div>
  )
}

export function CheckInCard({ due, today, onStart }: { due: string; today: string; onStart: () => void }) {
  const dia = WEEKDAY_LONG[weekday(due)]
  return (
    <div className="card mb-2.5 border-accent p-4">
      <h2 className="text-[15px] font-semibold text-strong">Atualizar semana</h2>
      <p className="mt-1 text-[13px] text-text-2">{`${due === today ? 'Hoje é' : 'Era'} ${dia}, seu dia de atualizar.`}</p>
      <Button className="mt-3 w-full" onClick={onStart}>Atualizar</Button>
    </div>
  )
}
