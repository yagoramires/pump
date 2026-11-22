import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { FEELINGS, FEELING_LABEL, feelingOf, type Feeling } from './summary'

export function EffortSheet({ value, onPick, onSkip, onClose }: { value?: number; onPick: (n: number) => void; onSkip: () => void; onClose: () => void }) {
  const current = feelingOf(value)
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="pb-1 text-title font-semibold text-strong">Como foi hoje?</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Quão puxado foi o treino</DrawerDescription>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FEELINGS) as Feeling[]).map((f) => (
              <Button key={f} variant={f === current ? 'default' : 'outline'} aria-pressed={f === current} className="h-12" onClick={() => { onPick(FEELINGS[f]); onClose() }}>{FEELING_LABEL[f]}</Button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => { onSkip(); onClose() }}>Pular</Button>
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
