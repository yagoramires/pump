import { HeartPulse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody, SheetRow } from '@/components/SheetRow'
import { CARDIO_ACTIVITIES } from './extra'


export function CardioSwitchSheet({ onPick, onClose }: { onPick: (activity: typeof CARDIO_ACTIVITIES[number]) => void; onClose: () => void }) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="pb-1 text-title font-semibold text-strong">Trocar cardio</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha a atividade para este treino</DrawerDescription>
          <Card variant="inset" size="flush">
            <ul>
              {CARDIO_ACTIVITIES.map((activity) => (
                <SheetRow key={activity.exerciseId} label={activity.name} icon={<HeartPulse aria-hidden="true" />} onClick={() => onPick(activity)} />
              ))}
            </ul>
          </Card>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
