import { useState } from 'react'
import { Camera } from 'lucide-react'
import type { Profile } from '@/profile/types'
import { Button } from '@/components/ui/button'
import { MeasureForm } from '@/evolution/MeasureForm'
import { PhotoCapture } from '@/evolution/PhotoCapture'
import { PhotoThumb } from '@/evolution/PhotoThumb'
import { usePhotoSets } from '@/evolution/photoSets'
import { ANGLE_LABEL, ANGLES } from '@/evolution/types'
import { CheckInDayChips } from './CheckInDayChips'

export function DayZero({ profile, date, checkInDay, onCheckInDayChange, onDone }: { profile: Profile; date: string; checkInDay: number; onCheckInDayChange: (day: number) => void; onDone: () => void }) {
  const { sets } = usePhotoSets()
  const [capturing, setCapturing] = useState(false)
  const todaySet = sets.find((s) => s.date === date)
  return (
    <>
      {capturing && <PhotoCapture date={date} onClose={() => setCapturing(false)} />}
      <MeasureForm date={date} profile={profile} needWeight submitLabel="Continuar" onSaved={onDone}>
        <div className="grid grid-cols-3 gap-2">
          {ANGLES.map((a) => (
            <Button key={a} type="button" variant="outline" aria-label={ANGLE_LABEL[a]} onClick={() => setCapturing(true)} className="block h-auto overflow-hidden rounded-lg p-0 text-caption font-normal text-text-2 has-[>svg]:px-0">
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
