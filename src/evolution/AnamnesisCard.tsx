import { X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ANAMNESIS_STEPS } from '@/profile/AnamnesisFlow'
import { useCheckIn } from './useCheckIn'

export function AnamnesisCard({ onStart }: { onStart: () => void }) {
  const { dismissAnamnesis } = useCheckIn()
  return (
    <Card className="relative gap-2 border-accent pr-14">
      <Button variant="outline" size="icon" className="absolute top-2 right-2" aria-label="Dispensar" onClick={dismissAnamnesis}><X size={16} /></Button>
      <h2 className="text-body font-semibold text-strong">Complete sua anamnese</h2>
      <p className="text-meta text-text-2">{ANAMNESIS_STEPS} passos rápidos. O que você já respondeu vem preenchido.</p>
      <Button className="w-full" onClick={onStart}>Completar</Button>
    </Card>
  )
}
