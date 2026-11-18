import { useState } from 'react'
import { Camera } from 'lucide-react'
import type { Profile } from '@/profile/types'
import type { Angle } from '@/evolution/types'
import { usePersisted } from '@/storage/db'
import { todayKey, weekday } from '@/lib/date'
import { WeekdayChips } from '@/profile/WeekdayChips'
import { MeasureForm } from '@/evolution/MeasureDrawer'
import { PhotoCapture } from '@/evolution/PhotoCapture'
import { PhotoThumb } from '@/evolution/PhotoThumb'
import { ANGLE_LABEL, ANGLES, usePhotoSets } from '@/evolution/photoSets'
import { upsertMeasurement } from '@/evolution/measurements'

/** Passo 3: peso e medidas de hoje, fotos e o dia do check-in semanal. Grava perfil + medição + check-in juntos */
export function DayZero({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const today = todayKey()
  const [list, setList] = usePersisted('measurements')
  const [, setProfile] = usePersisted('profile')
  const [settings, setSettings] = usePersisted('settings')
  const { sets } = usePhotoSets()
  const [day, setDay] = useState(settings.checkInDay ?? weekday(today))
  const [capturing, setCapturing] = useState(false)
  const todaySet = sets.find((s) => s.date === today)
  if (capturing) return <PhotoCapture date={today} onClose={() => setCapturing(false)} />
  return (
    <MeasureForm
      profile={profile}
      initial={list.find((m) => m.date === today)}
      needWeight
      submitLabel="Continuar"
      onSave={(fields) => {
        setProfile(profile)
        setList(upsertMeasurement(list, today, fields).list)
        setSettings((s) => ({ ...s, checkInDay: day, anamnesisAt: today }))
        onDone()
      }}
    >
      <div className="mt-4 grid grid-cols-3 gap-2">
        {ANGLES.map((a: Angle) => (
          <button key={a} type="button" aria-label={ANGLE_LABEL[a]} onClick={() => setCapturing(true)} className="overflow-hidden rounded-[11px] border border-border text-[12px] text-text-2">
            <PhotoThumb id={todaySet?.[a]} alt={ANGLE_LABEL[a]} empty={<Camera size={18} className="absolute inset-0 m-auto text-faint" />}>
              <span className="absolute inset-x-0 bottom-0 bg-bg/70 py-0.5 text-center">{ANGLE_LABEL[a]}</span>
            </PhotoThumb>
          </button>
        ))}
      </div>
      <div className="mt-4"><WeekdayChips label="Atualizar toda semana na" value={day} onChange={setDay} /></div>
    </MeasureForm>
  )
}
