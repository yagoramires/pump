import { HeartPulse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody, SheetRow } from '@/components/SheetRow'

const ACTIVITIES = [
  { exerciseId: 'cardio-bicicleta', name: 'Bicicleta' },
  { exerciseId: 'cardio-corrida', name: 'Corrida' },
  { exerciseId: 'cardio-caminhada', name: 'Caminhada' },
  { exerciseId: 'cardio-esteira', name: 'Esteira' },
  { exerciseId: 'cardio-eliptico', name: 'Elíptico' },
  { exerciseId: 'cardio-escada', name: 'Escada' },
]

export function CardioSwitchSheet({ onPick, onClose }: { onPick: (activity: typeof ACTIVITIES[number]) => void; onClose: () => void }) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="pb-1 text-title font-semibold text-strong">Trocar cardio</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha a atividade para este treino</DrawerDescription>
          <Card variant="inset" size="flush">
            <ul>
              {ACTIVITIES.map((activity) => (
                <SheetRow key={activity.exerciseId} label={activity.name} icon={<HeartPulse aria-hidden="true" />} onClick={() => onPick(activity)} />
              ))}
            </ul>
          </Card>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
