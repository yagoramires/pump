import { Droplet } from 'lucide-react'
import type { WaterSettings } from './types'
import { formatDec } from '@/lib/number'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { cupsShown } from './water'

const CUP = 'border disabled:opacity-100'

export function WaterCard({ ml, settings, onAdd, onRemove }: { ml: number; settings: WaterSettings; onAdd: () => void; onRemove: () => void }) {
  const { full, total } = cupsShown(ml, settings)
  return (
    <Card className="gap-3 p-3.5">
      <div className="text-[15px] font-semibold text-strong">{`Água · ${formatDec(ml / 1000)} de ${formatDec(settings.goalMl / 1000)} L`}</div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) =>
          i < full - 1 ? (
            <Button key={i} asChild variant="outline" size="icon" className={cn(CUP, 'border-c2 bg-c2/20 text-c2')}><span><Droplet aria-hidden="true" /></span></Button>
          ) : i === full - 1 ? (
            <Button key={i} variant="outline" size="icon" aria-label="Tirar copo" onClick={onRemove} className={cn(CUP, 'border-c2 bg-c2/20 text-c2 hover:bg-c2/30 hover:text-c2')}><Droplet aria-hidden="true" /></Button>
          ) : (
            <Button key={i} variant="outline" size="icon" aria-label="Adicionar copo" onClick={onAdd} className={cn(CUP, 'text-faint')}><Droplet aria-hidden="true" /></Button>
          ),
        )}
      </div>
    </Card>
  )
}
