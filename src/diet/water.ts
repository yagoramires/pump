import type { WaterDay, WaterLog, WaterSettings } from './types'

export const ML_PER_KG = 35
export const DEFAULT_GOAL_ML = 2000
export const WATER_LIMITS = { goalMl: [250, 10000], cupMl: [50, 1000] } as const

/** ligar: volta a configuração salva; na primeira vez, a meta do peso arredondada pra 250 (sem peso, 2 L) */
export const turnWaterOn = (w: WaterSettings | undefined, weightKg: number): WaterSettings =>
  w ? { ...w, enabled: true } : { enabled: true, goalMl: weightKg > 0 ? Math.round((ML_PER_KG * weightKg) / 250) * 250 : DEFAULT_GOAL_ML, cupMl: 250 }

/** soma ou tira um copo (nunca abaixo de 0) e guarda a meta do dia */
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
