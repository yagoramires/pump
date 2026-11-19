import { useState } from 'react'
import { FileInput, Plus, Sparkles, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Overlay } from '@/components/Overlay'
import { useDietPlan } from './useDietPlan'
import { DietEditor } from './DietEditor'
import { DietImport } from './DietImport'

export function DietStart({ hint, onDone }: { hint: string; onDone?: () => void }) {
  const { plan, replacePlan } = useDietPlan()
  const [view, setView] = useState<'edit' | 'ia' | 'convert'>()
  const close = () => setView(undefined)
  const done = onDone ?? close
  if (view === 'edit') return <Overlay><DietEditor initial={plan} onSave={(next) => { replacePlan(next); done() }} onCancel={close} /></Overlay>
  if (view) return <Overlay><DietImport mode={view} onDone={done} onBack={close} /></Overlay>
  return (
    <EmptyState icon={<Utensils size={30} aria-hidden="true" />} title="Monte seu cardápio">
      <p className="max-w-64 text-sm text-text-2">{hint}</p>
      <Button className="mt-3 w-full max-w-xs" onClick={() => setView('ia')}><Sparkles aria-hidden="true" />Gerar com IA</Button>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2">
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView('edit')}><Plus aria-hidden="true" />Do zero</Button>
        <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => setView('convert')}><FileInput aria-hidden="true" />Converter</Button>
      </div>
    </EmptyState>
  )
}
