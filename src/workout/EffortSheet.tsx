import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'

export function EffortSheet({ open, value, onPick, onSkip, onClose }: { open: boolean; value?: number; onPick: (n: number) => void; onSkip?: () => void; onClose: () => void }) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="pb-1 text-title font-semibold text-strong">Quão pesado foi?</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">1–3 leve · 4–6 moderado · 7–8 pesado · 9–10 no limite</DrawerDescription>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Button key={n} variant={n === value ? 'default' : 'outline'} aria-label={`Esforço ${n}`} aria-pressed={n === value} className="tabular-nums" onClick={() => { onPick(n); onClose() }}>{n}</Button>
            ))}
          </div>
          {onSkip && <Button variant="ghost" className="mt-3" onClick={() => { onSkip(); onClose() }}>Pular</Button>}
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
