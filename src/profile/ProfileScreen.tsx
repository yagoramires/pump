import { useState } from 'react'
import { usePersisted } from '@/storage/db'
import { todayKey } from '@/lib/date'
import { checkInDayOf } from '@/evolution/checkIn'
import { Button } from '@/components/ui/button'
import { hasProfile, profileDraft } from './profile'
import { AboutForm } from './AboutForm'
import { GoalsForm } from './GoalsForm'
import { CheckInDayChips } from './CheckInDayChips'

export function ProfileScreen({ onDone }: { onDone: () => void }) {
  const [saved, setProfile] = usePersisted('profile')
  const [settings, setSettings] = usePersisted('settings')
  const [draft, setDraft] = useState(() => profileDraft(saved))
  const [day, setDay] = useState(checkInDayOf(settings, todayKey()))
  return (
    <div className="flex flex-col gap-4 pb-6">
      <AboutForm value={draft} onChange={setDraft} />
      <GoalsForm value={draft} onChange={setDraft} />
      <CheckInDayChips value={day} onChange={setDay} />
      <Button type="button" disabled={!hasProfile(draft)} onClick={() => { setProfile(draft); setSettings((s) => ({ ...s, checkInDay: day })); onDone() }}>Salvar</Button>
    </div>
  )
}
