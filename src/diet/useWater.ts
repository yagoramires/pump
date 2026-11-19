import type { WaterSettings } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { latestWeight } from '@/evolution/measurements'
import { activeWater, addWater, turnWaterOn } from './water'

export function useWater() {
  const { today, tick } = useToday()
  const [settings, setSettings] = usePersisted('settings')
  const [measurements] = usePersisted('measurements')
  const [log, setLog] = usePersisted('waterLog')
  const on = activeWater(settings.water)

  const save = (water: WaterSettings) => setSettings((s) => ({ ...s, water }))
  const turnOn = () => save(turnWaterOn(settings.water, latestWeight(measurements) ?? 0))
  const act = (cups: 1 | -1) => {
    if (!on) return
    const date = tick()
    setLog((l) => addWater(l, date, on, cups))
  }

  return { on, ml: log[today]?.ml ?? 0, save, turnOn, act }
}
