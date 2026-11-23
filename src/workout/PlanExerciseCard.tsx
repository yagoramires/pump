import type { ReactNode } from 'react'
import type { PlanExercise } from './types'
import { ExerciseThumb } from './ExerciseGroups'
import { isCardio } from './reps'
import { KG, SETS } from './limits'
import { useFieldProps } from './useFieldProps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberField } from '@/components/NumberField'
import { cn } from '@/lib/utils'

const PILL_INPUT = 'h-11 border-transparent bg-transparent px-1 text-center font-semibold tabular-nums focus-visible:bg-surface'

function Pill({ unit, children }: { unit?: string; children: ReactNode }) {
  return (
    <label className="flex items-center rounded-md bg-panel pr-2">
      {children}
      {unit && <span className="text-caption text-text-2">{unit}</span>}
    </label>
  )
}

/** cartão do editor: miniatura e nome abrem a gaveta (descanso, observação, remover); séries, reps e carga se editam aqui */
export function PlanExerciseCard({ ex, onChange, onOpen, onPreview, lead, trail, className }: {
  ex: PlanExercise
  onChange: (patch: Partial<PlanExercise>) => void
  onOpen: () => void
  onPreview?: () => void
  /** checkbox do modo seleção */
  lead?: ReactNode
  /** alça de arrastar */
  trail?: ReactNode
  className?: string
}) {
  const fieldProps = useFieldProps()
  const cardio = isCardio(ex)
  const image = ex.images[0]
  return (
    <div className={cn('flex items-center gap-2 rounded-lg bg-surface py-2 pr-1 pl-2', className)}>
      {lead}
      {image && onPreview && (
        <Button type="button" variant="ghost" size="icon" aria-label={`Ver prévia de ${ex.name}`} onClick={onPreview}>
          <ExerciseThumb muscles={ex.muscles} image={image} cardio={cardio} />
        </Button>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Button type="button" variant="ghost" className="h-auto min-h-11 justify-start gap-2 px-1 text-left" aria-label={ex.name} onClick={onOpen}>
          {!image && <ExerciseThumb muscles={ex.muscles} cardio={cardio} />}
          <span className="truncate text-body font-bold text-strong">{ex.name}</span>
        </Button>
        <div className="flex flex-wrap gap-1.5">
          {!cardio && (
            <Pill unit="séries">
              <NumberField className={cn(PILL_INPUT, 'w-9')} aria-label={`Séries de ${ex.name}`} min={SETS[0]} max={SETS[1]} value={ex.sets} onChange={(n) => typeof n === 'number' && onChange({ sets: n })} {...fieldProps} />
            </Pill>
          )}
          <Pill unit={cardio ? undefined : 'reps'}>
            <Input className={cn(PILL_INPUT, cardio ? 'w-20' : 'w-14')} aria-label={`Repetições de ${ex.name}`} value={ex.reps} onChange={(e) => onChange({ reps: e.target.value })} {...fieldProps} />
          </Pill>
          {!cardio && (
            <Pill unit="kg">
              <NumberField className={cn(PILL_INPUT, 'w-14')} aria-label={`Carga de ${ex.name} em kg`} min={KG[0]} max={KG[1]} value={ex.weightKg} onChange={(n) => typeof n === 'number' && onChange({ weightKg: n })} {...fieldProps} />
            </Pill>
          )}
        </div>
      </div>
      {trail}
    </div>
  )
}
