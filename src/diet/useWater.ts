import type { WaterSettings } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { latestWeight } from '@/evolution/measurements'
import { activeWater, setWater, turnWaterOn } from './water'

export function useWater() {
  const { today, tick } = useToday()
  const [settings, setSettings] = usePersisted('settings')
  const [measurements] = usePersisted('measurements')
  const [log, setLog] = usePersisted('waterLog')
  const on = activeWater(settings.water)

  const save = (water: WaterSettings) => {
    setSettings((s) => ({ ...s, water }))
    // o dia de hoje guarda a meta do momento; sem isso, subir a meta depois de bater a antiga ainda contaria hoje como cumprido
    setLog((l) => (l[today] ? { ...l, [today]: { ...l[today], goalMl: water.goalMl } } : l))
  }
  const turnOn = () => save(turnWaterOn(settings.water, latestWeight(measurements) ?? 0))
  const set = (ml: number) => {
    if (!on) return
    const date = tick()
    setLog((l) => setWater(l, date, on, ml))
  }

  return { on, ml: log[today]?.ml ?? 0, save, turnOn, set }
}
