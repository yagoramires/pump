import type { WaterDay, WaterLog, WaterSettings } from '../types'

export const waterDefaults = (weightKg: number): WaterSettings => ({
  enabled: true,
  goalMl: weightKg > 0 ? Math.round((35 * weightKg) / 250) * 250 : 2000,
  cupMl: 250,
})

/** ligar: volta a configuração salva; na primeira vez, a meta do peso */
export const turnWaterOn = (w: WaterSettings | undefined, weightKg: number): WaterSettings => (w ? { ...w, enabled: true } : waterDefaults(weightKg))

const bump = (log: WaterLog, date: string, s: WaterSettings, delta: number): WaterLog => ({
  ...log,
  [date]: { ml: Math.max(0, (log[date]?.ml ?? 0) + delta), goalMl: s.goalMl },
})
export const addCup = (log: WaterLog, date: string, s: WaterSettings) => bump(log, date, s, s.cupMl)
export const removeCup = (log: WaterLog, date: string, s: WaterSettings) => bump(log, date, s, -s.cupMl)

export const cupsShown = (ml: number, s: WaterSettings) => {
  const base = Math.ceil(s.goalMl / s.cupMl)
  const full = Math.round(ml / s.cupMl)
  return { full, total: full >= base ? full + 1 : base }
}

export const waterMet = (d?: WaterDay) => !!d && d.goalMl > 0 && d.ml >= d.goalMl
