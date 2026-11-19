import { todayKey } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { hasProfile } from './profile'
import { useProfileDraft } from './useProfileDraft'
import { AboutForm } from './AboutForm'
import { GoalsForm } from './GoalsForm'
import { CheckInDayChips } from './CheckInDayChips'

export function ProfileScreen({ onDone }: { onDone: () => void }) {
  const { draft, setDraft, day, setDay, saveDraft } = useProfileDraft(todayKey())
  return (
    <div className="flex flex-col gap-4 pb-6">
      <AboutForm value={draft} onChange={setDraft} />
      <GoalsForm value={draft} onChange={setDraft} />
      <CheckInDayChips value={day} onChange={setDay} />
      <Button type="button" disabled={!hasProfile(draft)} onClick={() => { saveDraft(); onDone() }}>Salvar</Button>
    </div>
  )
}
