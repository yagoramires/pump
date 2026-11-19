import { toast } from 'sonner'
import { formatDayMonth } from '@/lib/date'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { MeasureForm } from './MeasureForm'

export function MeasureDrawer({ onClose, date }: { onClose: () => void; date: string }) {
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-5">
          <DrawerTitle className="pt-1 text-title font-semibold text-strong">Registrar · {formatDayMonth(date)}</DrawerTitle>
          <DrawerDescription className="sr-only">Peso e medidas do dia</DrawerDescription>
          <MeasureForm
            date={date}
            onSaved={(status) => {
              onClose()
              toast(status === 'same' ? 'Nada mudou' : status === 'saved' ? 'Medidas salvas' : 'Medidas apagadas')
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
