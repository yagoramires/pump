import { X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { todayKey } from '@/lib/date'
import { usePersisted } from '@/storage/db'
import { ANAMNESIS_STEPS } from './profile'

export function AnamnesisCard({ onStart }: { onStart: () => void }) {
  const [settings, setSettings] = usePersisted('settings')
  if (settings.anamnesisAt) return null
  const dismiss = () => setSettings((s) => ({ ...s, anamnesisAt: todayKey() }))
  return (
    <Card className="relative gap-2 border-accent pr-14">
      <Button variant="outline" size="icon" className="absolute top-2 right-2" aria-label="Dispensar" onClick={dismiss}><X size={16} /></Button>
      <h2 className="text-body font-semibold text-strong">Complete sua anamnese</h2>
      <p className="text-meta text-text-2">{ANAMNESIS_STEPS} passos rápidos. O que você já respondeu vem preenchido.</p>
      <Button className="w-full" onClick={onStart}>Completar</Button>
    </Card>
  )
}
