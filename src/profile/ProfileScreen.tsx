import { useState } from 'react'
import { usePersisted } from '@/storage/db'
import { weekday, todayKey } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { AboutForm } from './AboutForm'
import { GoalsForm } from './GoalsForm'
import { WeekdayChips } from './WeekdayChips'

export function ProfileScreen({ onDone }: { onDone: () => void }) {
  const [saved, setProfile] = usePersisted('profile')
  const [settings, setSettings] = usePersisted('settings')
  const [draft, setDraft] = useState(saved)
  const [day, setDay] = useState(settings.checkInDay ?? weekday(todayKey()))
  return (
    <div className="flex flex-col gap-4 pb-6">
      <AboutForm value={draft} onChange={setDraft} />
      <GoalsForm value={draft} onChange={setDraft} />
      <WeekdayChips label="Atualizar toda semana na" value={day} onChange={setDay} />
      <Button type="button" disabled={!draft.heightCm} onClick={() => { setProfile(draft); setSettings((s) => ({ ...s, checkInDay: day })); onDone() }}>Salvar</Button>
    </div>
  )
}
