import { useState } from 'react'
import { NumberField } from '@/components/NumberField'
import { Stepper } from '@/components/Stepper'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

const MIN: [number, number] = [1, 600]

/** Edita a duração em minutos: o início fica, o fim vira início + minutos */
export function DurationSheet({ startedAt, minutes, onSave, onClose }: { startedAt: string; minutes: number; onSave: (startedAt: string, endedAt: string) => void; onClose: () => void }) {
  const [min, setMin] = useState(Math.max(MIN[0], minutes))
  const save = () => onSave(startedAt, new Date(Date.parse(startedAt) + min * 60000).toISOString())
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-4 px-4 pb-5">
          <DrawerTitle className="text-title font-semibold text-strong">Duração do treino</DrawerTitle>
          <DrawerDescription className="sr-only">Ajuste quantos minutos o treino durou</DrawerDescription>
          <div className="flex items-center justify-center gap-2">
            <Stepper label="duração" value={min} step={5} min={MIN[0]} max={MIN[1]} onChange={setMin}>
              <NumberField className="w-28 pr-10 text-center" aria-label="Duração em minutos" unit="min" inputMode="numeric" value={min} min={MIN[0]} max={MIN[1]} onChange={(n) => n != null && setMin(Math.round(n))} />
            </Stepper>
          </div>
          <Button onClick={save}>Salvar</Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
