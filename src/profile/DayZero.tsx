import { useState } from 'react'
import { Camera } from 'lucide-react'
import type { Profile } from '@/profile/types'
import { usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { checkInDayOf } from '@/evolution/checkIn'
import { MeasureForm } from '@/evolution/MeasureForm'
import { PhotoCapture } from '@/evolution/PhotoCapture'
import { PhotoThumb } from '@/evolution/PhotoThumb'
import { usePhotoSets } from '@/evolution/photoSets'
import { ANGLE_LABEL, ANGLES } from '@/evolution/types'
import { CheckInDayChips } from './CheckInDayChips'

/** Passo 3: peso e medidas de hoje, fotos e o dia do check-in semanal. A medição é gravada aqui; o perfil e o dia, por quem recebe o onDone */
export function DayZero({ profile, onDone }: { profile: Profile; onDone: (checkInDay: number) => void }) {
  const today = todayKey()
  const [settings] = usePersisted('settings')
  const { sets } = usePhotoSets()
  const [day, setDay] = useState(checkInDayOf(settings, today))
  const [capturing, setCapturing] = useState(false)
  const todaySet = sets.find((s) => s.date === today)
  return (
    <>
      {capturing && <PhotoCapture date={today} onClose={() => setCapturing(false)} />}
      <MeasureForm date={today} profile={profile} needWeight submitLabel="Continuar" onSaved={() => onDone(day)}>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {ANGLES.map((a) => (
            <button key={a} type="button" aria-label={ANGLE_LABEL[a]} onClick={() => setCapturing(true)} className="overflow-hidden rounded-[11px] border border-border text-[12px] text-text-2">
              <PhotoThumb id={todaySet?.[a]} alt={ANGLE_LABEL[a]} empty={<Camera size={18} className="absolute inset-0 m-auto text-faint" />}>
                <span className="absolute inset-x-0 bottom-0 bg-bg/70 py-0.5 text-center">{ANGLE_LABEL[a]}</span>
              </PhotoThumb>
            </button>
          ))}
        </div>
        <div className="mt-4"><CheckInDayChips value={day} onChange={setDay} /></div>
      </MeasureForm>
    </>
  )
}
