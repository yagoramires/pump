import { useState } from 'react'
import { X } from 'lucide-react'
import { usePersisted } from '@/storage/db'
import { WEEKDAY_LONG, todayKey, weekday } from '@/lib/date'
import { formatKg, formatSigned, plural } from '@/lib/number'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BackHeader } from '@/components/BackHeader'
import { MeasureForm } from './MeasureDrawer'
import { PhotoCapture } from './PhotoCapture'
import { PhotoCompare } from './PhotoCompare'
import { Delta } from './Delta'
import { upsertMeasurement } from './measurements'
import { goalDirection, isGood } from './bodyFat'
import { weekSummary } from './checkIn'
import { usePhotoSets } from './photoSets'

type Step = 'measure' | 'photos' | 'summary' | 'compare'

/** passo a passo da atualização semanal: medidas de hoje, fotos (opcional) e resumo */
export function CheckIn({ onClose }: { onClose: () => void }) {
  const today = todayKey()
  const [list, setList] = usePersisted('measurements')
  const [profile] = usePersisted('profile')
  const { sets } = usePhotoSets()
  const [step, setStep] = useState<Step>('measure')

  if (step === 'photos') return <PhotoCapture date={today} onClose={() => setStep('summary')} />
  if (step === 'compare') return <PhotoCompare onClose={() => setStep('summary')} />
  if (step === 'measure') {
    return (
      <>
        <BackHeader title="Atualizar semana" onBack={onClose} />
        <MeasureForm
          profile={profile}
          initial={list.find((m) => m.date === today)}
          needWeight
          submitLabel="Continuar"
          onSave={(fields) => {
            const { list: next, status } = upsertMeasurement(list, today, fields)
            if (status !== 'same') setList(next)
            setStep('photos')
          }}
        />
      </>
    )
  }

  const s = weekSummary(profile, list, sets, today)
  if (!s) return <BackHeader title="Atualizar semana" onBack={onClose} />
  const good = s.sincePrev !== undefined && isGood('weightKg', goalDirection(profile), s.sincePrev)
  return (
    <div>
      <BackHeader title={`Semana ${s.week}`} onBack={onClose} />
      <div className="card mt-3 p-4">
        {s.sincePrev === undefined ? (
          <div className="text-[28px] font-semibold text-strong tabular-nums">{`${formatKg(s.weight)} kg`}</div>
        ) : (
          <>
            <div className={cn('text-[28px] font-semibold tabular-nums', good ? 'text-accent' : 'text-strong')}>{`${formatSigned(s.sincePrev)} kg`}</div>
            <div className="text-[13px] text-text-2">{`desde a semana passada · ${formatKg(s.weight)} kg`}</div>
          </>
        )}
        {s.rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-t border-line py-2 text-sm">
            <span className="text-text-2">{r.label}</span>
            <Delta value={r.delta} good={r.good} unit={r.unit} />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line py-2 text-sm">
          <span className="text-text-2">Fotos · {s.photos} de 3</span>
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

export function AnamnesisCard({ onStart }: { onStart: () => void }) {
  const [, setSettings] = usePersisted('settings')
  return (
    <div className="card relative mb-2.5 border-accent p-4 pr-12">
      <button type="button" className="icon-btn absolute top-2 right-2" aria-label="Dispensar" onClick={() => setSettings((s) => ({ ...s, anamnesisAt: todayKey() }))}><X size={16} /></button>
      <h2 className="text-[15px] font-semibold text-strong">Complete sua anamnese</h2>
      <p className="mt-1 text-[13px] text-text-2">3 passos rápidos. O que você já respondeu vem preenchido.</p>
      <Button className="mt-3 w-full" onClick={onStart}>Completar</Button>
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
