import { omitKey } from '@/lib/utils'
import type { WaterDay, WaterLog, WaterSettings } from './types'

export const ML_PER_KG = 35
const DEFAULT_GOAL_ML = 2000
/** a meta pelo peso arredonda de 250 em 250 ml */
const CUP_ML = 250

export const activeWater = (settings?: WaterSettings) => settings?.enabled ? settings : undefined

export const turnWaterOn = (w: WaterSettings | undefined, weightKg: number): WaterSettings =>
  w ? { ...w, enabled: true } : { enabled: true, goalMl: weightKg > 0 ? Math.round((ML_PER_KG * weightKg) / CUP_ML) * CUP_ML : DEFAULT_GOAL_ML }

export const setWater = (log: WaterLog, date: string, s: WaterSettings, ml: number): WaterLog => ({
  ...log,
  [date]: { ml: Math.max(0, ml), goalMl: s.goalMl },
})

/** até a meta; batida, deixa passar 500 ml além do já bebido */
export const waterMax = (ml: number, goalMl: number) => (ml < goalMl ? goalMl : ml + 500)

export const waterMet = (d?: WaterDay) => !!d && d.goalMl > 0 && d.ml >= d.goalMl
export const hasWater = (d?: WaterDay) => (d?.ml ?? 0) > 0
export const removeWaterDay = (log: WaterLog, date: string): WaterLog => omitKey(log, date)
