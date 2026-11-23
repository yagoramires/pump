import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { DietItem } from './types'
import { iaLabel, itemKcalText } from './display'
import { GRAMS } from './limits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberField } from '@/components/NumberField'

const PILL_INPUT = 'h-11 border-transparent bg-transparent px-1 font-semibold tabular-nums focus-visible:bg-surface'

/** cartão do alimento no editor: porção e gramas se editam aqui; a alça (trail) arrasta */
export function DietItemCard({ item, onChange, onRemove, lead, trail }: {
  item: DietItem
  onChange: (patch: Partial<DietItem>) => void
  onRemove: () => void
  lead?: ReactNode
  trail?: ReactNode
}) {
  const ia = iaLabel(item)
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface py-2 pr-1 pl-3">
      {lead}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-body font-bold text-strong">{item.name}</span>
          <span className="text-caption tabular-nums text-text-2">{itemKcalText(item)}</span>
        </div>
        {ia && <span className="text-caption text-warning">{ia}</span>}
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center rounded-md bg-panel pr-2">
            <NumberField className={`${PILL_INPUT} w-14 text-center`} aria-label={`Gramas de ${item.name}`} autoComplete="off" enterKeyHint="done" min={GRAMS[0]} max={GRAMS[1]} value={item.grams} onChange={(n) => n != null && onChange({ grams: n })} />
            <span className="text-caption text-text-2">g</span>
          </label>
          <Input className={`${PILL_INPUT} w-28 rounded-md bg-panel px-2`} aria-label={`Porção de ${item.name}`} placeholder="Porção" autoComplete="off" value={item.portion ?? ''} onChange={(e) => onChange({ portion: e.target.value || undefined })} />
          <Button variant="ghost" size="icon" className="ml-auto text-text-2" aria-label={`Remover ${item.name}`} onClick={onRemove}><Trash2 aria-hidden="true" /></Button>
        </div>
      </div>
      {trail}
    </div>
  )
}
