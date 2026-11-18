import { Check } from 'lucide-react'
import type { Workout } from './types'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'

type Props = { workouts: Workout[]; shownId?: string; nextId?: string; onPick: (w: Workout) => void; onClose: () => void }

export function SwitchWorkout({ workouts, shownId, nextId, onPick, onClose }: Props) {
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="shrink-0 truncate pb-1 text-[19px] font-semibold text-strong">Trocar treino</DrawerTitle>
          <DrawerDescription className="pb-3 text-[13px] text-text-2">Escolha o treino de hoje.</DrawerDescription>
          <ul className="overflow-hidden card">
            {workouts.map((w) => (
              <li key={w.id} className="border-t border-line first:border-t-0">
                <button type="button" aria-current={w.id === shownId} onClick={() => onPick(w)} className="flex min-h-14 w-full items-center gap-3 px-3 text-left">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-line bg-accent-bg text-sm font-bold text-accent">{w.label}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-strong">{w.name}</span>
                  {w.id === nextId && <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] text-accent">próximo</span>}
                  {w.id === shownId && <Check size={16} className="text-accent" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
