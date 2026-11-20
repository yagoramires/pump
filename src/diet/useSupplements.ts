import type { Supplement } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { syncToday, toggleSupplement } from './supplements'

export function useSupplements() {
  const { today, tick } = useToday()
  const [settings, setSettings] = usePersisted('settings')
  const [log, setLog] = usePersisted('supplementLog')
  const list = settings.supplements ?? []

  const toggle = (id: string) => {
    const date = tick()
    setLog((l) => toggleSupplement(l, date, id, list.length))
  }
  const save = (next: Supplement[]) => {
    setSettings((s) => ({ ...s, supplements: next }))
    setLog((l) => syncToday(l, today, next))
  }

  return { list, taken: log[today]?.taken ?? [], toggle, save }
}
