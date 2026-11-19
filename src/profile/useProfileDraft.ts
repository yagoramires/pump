import { useState } from 'react'
import { weekday } from '@/lib/date'
import { usePersisted } from '@/storage/db'
import { profileDraft } from './profile'

export function useProfileDraft(date: string) {
  const [profile, setProfile] = usePersisted('profile')
  const [settings, setSettings] = usePersisted('settings')
  const [draft, setDraft] = useState(() => profileDraft(profile))
  const [selectedDay, setDay] = useState(settings.checkInDay)
  const day = selectedDay ?? weekday(date)

  function saveDraft(completedAnamnesis = false) {
    setProfile(draft)
    setSettings((s) => ({ ...s, checkInDay: day, ...(completedAnamnesis ? { anamnesisAt: date } : {}) }))
  }

  return { draft, setDraft, day, setDay, saveDraft }
}
