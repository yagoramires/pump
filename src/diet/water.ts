import { omitKey } from '@/lib/utils'
import type { WaterDay, WaterLog, WaterSettings } from './types'

export const ML_PER_KG = 35
const DEFAULT_GOAL_ML = 2000
/** copo padrão; a meta pelo peso arredonda pra copos inteiros */
const CUP_ML = 250

export const activeWater = (settings?: WaterSettings) => settings?.enabled ? settings : undefined

export const turnWaterOn = (w: WaterSettings | undefined, weightKg: number): WaterSettings =>
  w ? { ...w, enabled: true } : { enabled: true, goalMl: weightKg > 0 ? Math.round((ML_PER_KG * weightKg) / CUP_ML) * CUP_ML : DEFAULT_GOAL_ML, cupMl: CUP_ML }

export const addWater = (log: WaterLog, date: string, s: WaterSettings, cups: 1 | -1): WaterLog => ({
  ...log,
  [date]: { ml: Math.max(0, (log[date]?.ml ?? 0) + cups * s.cupMl), goalMl: s.goalMl },
})

export const cupsShown = (ml: number, s: WaterSettings) => {
  const base = Math.ceil(s.goalMl / s.cupMl)
  const full = Math.round(ml / s.cupMl)
  return { full, total: full >= base ? full + 1 : base }
}

export const waterMet = (d?: WaterDay) => !!d && d.goalMl > 0 && d.ml >= d.goalMl
export const hasWater = (d?: WaterDay) => (d?.ml ?? 0) > 0
export const removeWaterDay = (log: WaterLog, date: string): WaterLog => omitKey(log, date)
