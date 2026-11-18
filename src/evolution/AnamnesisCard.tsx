import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ANAMNESIS_STEPS } from '@/profile/AnamnesisFlow'
import { useCheckIn } from './useCheckIn'

export function AnamnesisCard({ onStart }: { onStart: () => void }) {
  const { dismissAnamnesis } = useCheckIn()
  return (
    <div className="card relative mb-2.5 border-accent p-4 pr-12">
      <button type="button" className="icon-btn absolute top-2 right-2" aria-label="Dispensar" onClick={dismissAnamnesis}><X size={16} /></button>
      <h2 className="text-[15px] font-semibold text-strong">Complete sua anamnese</h2>
      <p className="mt-1 text-[13px] text-text-2">{ANAMNESIS_STEPS} passos rápidos. O que você já respondeu vem preenchido.</p>
      <Button className="mt-3 w-full" onClick={onStart}>Completar</Button>
    </div>
  )
}
