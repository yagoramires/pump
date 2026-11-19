import { toast } from 'sonner'
import { formatDayMonth, todayKey } from '@/lib/date'
import { Badge } from '@/components/ui/badge'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { MeasureForm } from './MeasureForm'

export function MeasureDrawer({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-5">
          <div className="flex items-center justify-between gap-2 pt-1">
            <DrawerTitle className="text-[19px] font-semibold text-strong">Registrar · {formatDayMonth(date)}</DrawerTitle>
            {date === todayKey() && <Badge variant="outline" className="rounded-md text-[11px] text-text-2">hoje</Badge>}
          </div>
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
