import { Droplet } from 'lucide-react'
import type { WaterSettings } from './types'
import { formatDec } from '@/lib/number'
import { cn } from '@/lib/utils'
import { cupsShown } from './water'

const CUP = 'flex size-11 items-center justify-center rounded-xl border'

export function WaterCard({ ml, settings, onAdd, onRemove }: { ml: number; settings: WaterSettings; onAdd: () => void; onRemove: () => void }) {
  const { full, total } = cupsShown(ml, settings)
  return (
    <div className="mb-2.5 rounded-[14px] border border-border bg-panel p-3.5">
      <div className="text-[15px] font-semibold text-strong">{`Água · ${formatDec(ml / 1000)} de ${formatDec(settings.goalMl / 1000)} L`}</div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) =>
          i < full - 1 ? (
            <span key={i} className={cn(CUP, 'border-c2 bg-c2/20 text-c2')}><Droplet size={18} aria-hidden="true" /></span>
          ) : i === full - 1 ? (
            <button key={i} type="button" aria-label="Tirar copo" onClick={onRemove} className={cn(CUP, 'border-c2 bg-c2/20 text-c2')}><Droplet size={18} aria-hidden="true" /></button>
          ) : (
            <button key={i} type="button" aria-label="Adicionar copo" onClick={onAdd} className={cn(CUP, 'border-border text-faint')}><Droplet size={18} aria-hidden="true" /></button>
          ),
        )}
      </div>
    </div>
  )
}
