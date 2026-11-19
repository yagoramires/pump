import { Check } from 'lucide-react'
import type { Workout } from './types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'

type Props = { workouts: Workout[]; shownId?: string; nextId?: string; onPick: (w: Workout) => void; onClose: () => void }

export function SwitchWorkout({ workouts, shownId, nextId, onPick, onClose }: Props) {
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="shrink-0 truncate pb-1 text-title font-semibold text-strong">Trocar treino</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Escolha o treino de hoje.</DrawerDescription>
          <Card size="flush" variant="inset"><ul>
            {workouts.map((w) => (
              <li key={w.id} className="border-t border-line first:border-t-0">
                <Button variant="ghost" aria-current={w.id === shownId} onClick={() => onPick(w)} className="h-auto min-h-14 w-full justify-start gap-3 rounded-none px-3 text-left font-normal">
                  <Badge variant="tile">{w.label}</Badge>
                  <span className="min-w-0 flex-1 text-body font-semibold text-strong">{w.name}</span>
                  {w.id === nextId && <Badge>próximo</Badge>}
                  {w.id === shownId && <Check size={16} className="text-accent" aria-hidden="true" />}
                </Button>
              </li>
            ))}
          </ul></Card>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
