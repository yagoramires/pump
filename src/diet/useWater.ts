import type { WaterSettings } from './types'
import { usePersisted } from '../storage/db'
import { useToday } from '../lib/useToday'
import { addWater, turnWaterOn } from './water'

/** contador de água: configuração (em `settings.water`) e os copos de hoje */
export function useWater() {
  const { today, tick } = useToday()
  const [settings, setSettings] = usePersisted('settings')
  const [profile] = usePersisted('profile')
  const [log, setLog] = usePersisted('waterLog')
  const on = settings.water?.enabled ? settings.water : undefined

  const save = (water: WaterSettings) => setSettings((s) => ({ ...s, water }))
  const turnOn = () => {
    const water = turnWaterOn(settings.water, profile.weightKg)
    save(water)
    return water
  }
  const act = (cups: 1 | -1) => {
    if (!on) return
    const date = tick()
    setLog((l) => addWater(l, date, on, cups))
  }

  return { settings: settings.water, on, ml: log[today]?.ml ?? 0, save, turnOn, act }
}
