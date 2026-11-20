import { useState } from 'react'
import { Camera } from 'lucide-react'
import type { DayZeroProps } from '@/profile/AnamnesisFlow'
import { Alert } from '@/components/ui/alert'
import { FieldLabel } from '@/components/FieldLabel'
import { Button } from '@/components/ui/button'
import { usePersisted } from '@/storage/db'
import { CheckInDayChips } from '@/profile/CheckInDayChips'
import { MeasureForm } from './MeasureForm'
import { PhotoCapture } from './PhotoCapture'
import { PhotoThumb } from './PhotoThumb'
import { ANGLE_LABEL, ANGLES, type Angle } from './types'

/** passo final da anamnese: quem abre o AnamnesisFlow passa este componente */
export function DayZero({ profile, date, checkInDay, onCheckInDayChange, onDone }: DayZeroProps) {
  const [sets] = usePersisted('photoSets')
  const [capturing, setCapturing] = useState<Angle>()
  const todaySet = sets.find((s) => s.date === date)
  return (
    <>
      {capturing && <PhotoCapture date={date} angle={capturing} onClose={() => setCapturing(undefined)} />}
      <Alert role="note">Só o peso é obrigatório. Medidas melhoram a estimativa de % de gordura; fotos ajudam a comparar depois.</Alert>
      <MeasureForm date={date} profile={profile} needWeight submitLabel="Continuar" onSaved={onDone}>
        <FieldLabel label="Fotos" optional />
        <div className="grid grid-cols-3 gap-2">
          {ANGLES.map((a) => (
            <Button key={a} type="button" variant="outline" aria-label={ANGLE_LABEL[a]} onClick={() => setCapturing(a)} className="block h-auto overflow-hidden rounded-lg p-0 text-caption font-normal text-text-2 has-[>svg]:px-0">
              <PhotoThumb id={todaySet?.[a]} alt={ANGLE_LABEL[a]} empty={<Camera size={18} className="absolute inset-0 m-auto text-faint" />}>
                <span className="absolute inset-x-0 bottom-0 bg-bg/70 py-0.5 text-center">{ANGLE_LABEL[a]}</span>
              </PhotoThumb>
            </Button>
          ))}
        </div>
        <CheckInDayChips value={checkInDay} onChange={onCheckInDayChange} />
      </MeasureForm>
    </>
  )
}
