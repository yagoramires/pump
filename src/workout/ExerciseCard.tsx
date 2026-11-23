import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { SessionExercise, SetDone } from './types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ExerciseThumb } from './ExerciseGroups'
import { exerciseSummary, restSecondsLabel } from './display'
import { isExerciseComplete, markedSets, setsToDo } from './session'
import { suggestedKg } from './stats'
import { cn } from '@/lib/utils'

type Props = { ex: SessionExercise; open: boolean; onToggle: () => void; onPreview: () => void; prev: (SetDone | null)[]; children?: ReactNode }

export function ExerciseCard({ ex, open, onToggle, onPreview, prev, children }: Props) {
  const done = markedSets(ex).length
  const complete = isExerciseComplete(ex)
  const sub = open
    ? [ex.muscles[0], `descanso ${restSecondsLabel(ex.restSec)}`].filter(Boolean).join(' · ')
    : exerciseSummary({ ...ex, weightKg: suggestedKg(ex, prev) })
  return (
    <Collapsible asChild open={open} onOpenChange={onToggle}>
      <Card size="flush" className={cn(open && 'border-accent-line')}>
        <div className="flex items-center pl-1.5 pr-3">
          <Button variant="ghost" size="icon" aria-label={`Ver ${ex.name}`} onClick={onPreview}>
            <ExerciseThumb muscles={ex.muscles} image={ex.images[0]} />
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto min-h-14 min-w-0 flex-1 justify-start gap-2 py-2.5 pl-1.5 text-left font-normal whitespace-normal hover:bg-transparent">
              <span className="block min-w-0 flex-1">
                <span className="block text-body font-semibold break-words text-strong">{ex.name}</span>
                <span className="block text-meta text-text-2 first-letter:uppercase">{sub}</span>
              </span>
              <span className={cn('flex shrink-0 items-center gap-1.5 text-meta font-normal tabular-nums', complete ? 'text-success-fg' : 'text-text-2')}>
                {done}/{setsToDo(ex)}
                {complete ? <Check size={14} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />}
              </span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
