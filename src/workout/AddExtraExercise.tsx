import { useState } from 'react'
import type { CustomExercise, Exercise } from './types'
import { CatalogPicker } from './CatalogPicker'
import { SETS } from './limits'
import { plural } from '@/lib/number'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

/** Catálogo → escolha do número de séries → onAdd */
export function AddExtraExercise({ onAdd, onClose }: { onAdd: (e: Exercise | CustomExercise, sets: number) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<Exercise | CustomExercise>()
  const [sets, setSets] = useState(3)
  return (
    <>
      <CatalogPicker onPick={(e) => { setSets(3); setPicked(e) }} onClose={onClose} />
      <Drawer open={!!picked} onOpenChange={(o) => !o && setPicked(undefined)}>
        <DrawerContent>
          <div className="flex flex-col gap-4 px-4 pb-5">
            <DrawerTitle className="text-title font-semibold text-strong">{picked?.name}</DrawerTitle>
            <DrawerDescription className="sr-only">Escolha quantas séries fazer</DrawerDescription>
            <div className="flex items-center justify-center gap-3">
              <Stepper label="Séries" text={plural(sets, 'série', 'séries')} value={sets} step={1} min={SETS[0]} max={SETS[1]} onChange={setSets} />
            </div>
            <Button onClick={() => picked && onAdd(picked, sets)}>Adicionar</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
