import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { checkInDue } from './checkIn'

/** estado do check-in semanal e da anamnese num lugar só: ponto da aba e cartões leem o mesmo relógio */
export function useCheckIn() {
  const { today } = useToday()
  const [settings, setSettings] = usePersisted('settings')
  const [measurements] = usePersisted('measurements')
  return {
    today,
    due: checkInDue(settings, measurements, today),
    anamnesisPending: !settings.anamnesisAt,
    // anamnesisAt marca "cartão resolvido": concluir o fluxo ou dispensar
    dismissAnamnesis: () => setSettings((s) => ({ ...s, anamnesisAt: today })),
  }
}
