import { useState } from 'react'
import type { WorkoutSession } from './types'
import { hhmm, parseDayKey } from '@/lib/date'
import { TimePicker } from '@/components/TimePicker'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'

/** HH:MM no dia da sessão, em hora local */
const at = (date: string, time: string) => {
  const d = parseDayKey(date)
  const [h, m] = time.split(':').map(Number)
  d.setHours(h, m)
  return d
}

export function DurationSheet({ session, onSave, onClose }: { session: WorkoutSession; onSave: (startedAt: string, endedAt: string) => void; onClose: () => void }) {
  const initial = (iso?: string) => hhmm(iso ? new Date(iso) : parseDayKey(session.date))
  const [start, setStart] = useState(initial(session.startedAt))
  const [end, setEnd] = useState(initial(session.endedAt ?? session.completedAt))
  const [s, e] = [at(session.date, start), at(session.date, end)]
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="flex flex-col gap-4 px-4 pb-5">
          <DrawerTitle className="text-title font-semibold text-strong">Duração do treino</DrawerTitle>
          <DrawerDescription className="sr-only">Ajuste o horário de início e de fim</DrawerDescription>
          <div className="flex gap-3">
            <TimePicker aria-label="Início" value={start} onChange={(v) => v && setStart(v)} />
            <TimePicker aria-label="Fim" value={end} onChange={(v) => v && setEnd(v)} />
          </div>
          <Button disabled={e <= s} onClick={() => onSave(s.toISOString(), e.toISOString())}>Salvar</Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
