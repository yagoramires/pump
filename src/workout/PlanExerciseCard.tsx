import type { ReactNode } from 'react'
import type { PlanExercise } from './types'
import { ExerciseThumb } from './ExerciseGroups'
import { isCardio } from './reps'
import { KG, SETS } from './limits'
import { useFieldProps } from './useFieldProps'
import { Button } from '@/components/ui/button'
import { PillNumber, PillText } from '@/components/Pill'
import { cn } from '@/lib/utils'

/** cartão do editor: miniatura e nome abrem a gaveta (descanso, observação, remover); séries, reps e carga se editam aqui */
export function PlanExerciseCard({ ex, onChange, onOpen, onPreview, checkbox, handle, className }: {
  ex: PlanExercise
  onChange: (patch: Partial<PlanExercise>) => void
  onOpen: () => void
  onPreview?: () => void
  checkbox?: ReactNode
  handle?: ReactNode
  className?: string
}) {
  const fieldProps = useFieldProps()
  const cardio = isCardio(ex)
  const image = ex.images[0]
  return (
    <div className={cn('flex items-center gap-2 rounded-lg bg-surface py-2 pr-1 pl-2', className)}>
      {checkbox}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center">
          {image && onPreview && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Ver prévia de ${ex.name}`} onClick={onPreview}>
              <ExerciseThumb muscles={ex.muscles} image={image} cardio={cardio} />
            </Button>
          )}
          <Button type="button" variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start gap-2 px-1 text-left" aria-label={ex.name} onClick={onOpen}>
            {!(image && onPreview) && <ExerciseThumb muscles={ex.muscles} cardio={cardio} />}
            <span className="truncate text-body font-bold text-strong">{ex.name}</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!cardio && <PillNumber unit="séries" className="w-9" aria-label={`Séries de ${ex.name}`} min={SETS[0]} max={SETS[1]} value={ex.sets} onChange={(n) => typeof n === 'number' && onChange({ sets: n })} {...fieldProps} />}
          <PillText unit={cardio ? undefined : 'reps'} className={cardio ? 'w-20' : 'w-14'} aria-label={`Repetições de ${ex.name}`} value={ex.reps} onChange={(e) => onChange({ reps: e.target.value })} {...fieldProps} />
          {!cardio && <PillNumber unit="kg" className="w-14" aria-label={`Carga de ${ex.name} em kg`} min={KG[0]} max={KG[1]} value={ex.weightKg} onChange={(n) => typeof n === 'number' && onChange({ weightKg: n })} {...fieldProps} />}
        </div>
      </div>
      {handle}
    </div>
  )
}
