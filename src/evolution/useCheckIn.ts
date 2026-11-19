import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { checkInDue } from './checkIn'

export function useCheckIn() {
  const { today } = useToday()
  const [settings] = usePersisted('settings')
  const [measurements] = usePersisted('measurements')
  return {
    today,
    due: checkInDue(settings, measurements, today),
  }
}
