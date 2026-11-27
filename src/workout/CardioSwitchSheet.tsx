import { HeartPulse, ListChecks, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody, SheetRow } from '@/components/SheetRow'
import { ExerciseThumb } from './ExerciseGroups'
import { CARDIO_ACTIVITIES, SPORT_ACTIVITIES, type Activity } from './extra'

const GROUPS = [
  { title: 'Cardio', items: CARDIO_ACTIVITIES, icon: <HeartPulse aria-hidden="true" /> },
  { title: 'Esportes', items: SPORT_ACTIVITIES, icon: <Trophy aria-hidden="true" /> },
]

/** planned: atalho para o cardio que já está na ficha */
export function CardioSwitchSheet({ title = 'Trocar atividade', planned, onPick, onPlanned, onClose }: { title?: string; planned?: string; onPick: (activity: Activity) => void; onPlanned?: () => void; onClose: () => void }) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="pb-1 text-title font-semibold text-strong">{title}</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha a atividade para este treino</DrawerDescription>
          <div className="flex flex-col gap-3">
            {planned && onPlanned && (
              <Card variant="inset" size="flush">
                <ul><SheetRow label={planned} icon={<ListChecks aria-hidden="true" />} onClick={onPlanned} /></ul>
              </Card>
            )}
            {GROUPS.map((g) => (
              <section key={g.title} aria-label={g.title} className="flex flex-col gap-1.5">
                <h3 className="text-meta text-text-2">{g.title}</h3>
                <Card variant="inset" size="flush">
                  <ul>
                    {g.items.map((activity) => (
                      <SheetRow key={activity.exerciseId} label={activity.name} icon={activity.images ? <ExerciseThumb muscles={[]} image={activity.images[0]} cardio /> : g.icon} onClick={() => onPick(activity)} />
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
