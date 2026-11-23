import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { DietItem } from './types'
import { iaLabel, itemKcalText } from './display'
import { GRAMS } from './limits'
import { Button } from '@/components/ui/button'
import { PillNumber, PillText } from '@/components/Pill'

export function DietItemCard({ item, onChange, onRemove, checkbox, handle }: {
  item: DietItem
  onChange: (patch: Partial<DietItem>) => void
  onRemove: () => void
  checkbox?: ReactNode
  handle?: ReactNode
}) {
  const ia = iaLabel(item)
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface py-2 pr-1 pl-3">
      {checkbox}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-body font-bold text-strong">{item.name}</span>
          <span className="text-caption tabular-nums text-text-2">{itemKcalText(item)}</span>
        </div>
        {ia && <span className="text-caption text-warning">{ia}</span>}
        <div className="flex flex-wrap items-center gap-1.5">
          <PillNumber unit="g" className="w-14" aria-label={`Gramas de ${item.name}`} min={GRAMS[0]} max={GRAMS[1]} value={item.grams} onChange={(n) => typeof n === 'number' && onChange({ grams: n })} />
          <PillText className="w-28 text-left" aria-label={`Porção de ${item.name}`} placeholder="Porção" value={item.portion ?? ''} onChange={(e) => onChange({ portion: e.target.value || undefined })} />
          <Button variant="ghost" size="icon" className="ml-auto text-text-2" aria-label={`Remover ${item.name}`} onClick={onRemove}><Trash2 aria-hidden="true" /></Button>
        </div>
      </div>
      {handle}
    </div>
  )
}
