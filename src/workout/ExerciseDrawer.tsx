import type { PlanExercise } from './types'
import { KG, REST_SEC, REST_STEP, SETS } from './limits'
import { restSecondsLabel } from './display'
import { useNumberDraft } from '@/components/useNumberDraft'
import { Stepper } from '@/components/Stepper'
import { useFieldProps } from './useFieldProps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

type Props = {
  ex: PlanExercise
  onChange: (next: PlanExercise) => void
  onRemove: () => void
  onClose: () => void
}

const FIELD = 'bg-surface text-center font-semibold tabular-nums'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-2">
      <span className="text-sm text-text-2">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

export function ExerciseDrawer({ ex, onChange, onRemove, onClose }: Props) {
  const patch = (p: Partial<PlanExercise>) => onChange({ ...ex, ...p })
  const kg = useNumberDraft(ex.weightKg, ...KG, (n) => n != null && patch({ weightKg: n }))
  const inputProps = useFieldProps()

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-2 px-4 pb-5">
          <div className="min-w-0">
            <DrawerTitle className="text-title font-semibold text-strong">{ex.name}</DrawerTitle>
            <DrawerDescription className="text-meta text-text-2 first-letter:uppercase">{ex.muscles.join(' · ')}</DrawerDescription>
          </div>
          <Row label="Séries"><Stepper label="séries" value={ex.sets} text={String(ex.sets)} step={1} min={SETS[0]} max={SETS[1]} onChange={(sets) => patch({ sets })} /></Row>
          <Row label="Repetições">
            <Input className={`${FIELD} w-28`} aria-label="Repetições" value={ex.reps} onChange={(e) => patch({ reps: e.target.value })} {...inputProps} />
          </Row>
          <Row label="Carga">
            <Stepper label="carga" value={ex.weightKg} step={2.5} min={KG[0]} max={KG[1]} onChange={(weightKg) => patch({ weightKg })}>
            <Input className={`${FIELD} w-20`} inputMode="decimal" aria-label="Carga em kg" {...inputProps} {...kg} />
            </Stepper>
          </Row>
          <Row label="Descanso"><Stepper label="descanso" value={ex.restSec} text={restSecondsLabel(ex.restSec)} step={REST_STEP} min={REST_SEC[0]} max={REST_SEC[1]} onChange={(restSec) => patch({ restSec })} /></Row>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 text-negative hover:text-negative" onClick={onRemove}>Remover</Button>
            <Button className="flex-1" onClick={onClose}>Pronto</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
