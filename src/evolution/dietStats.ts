import type { DietLog, DietPlan, WaterLog } from '@/diet/types'
import { daysBetween } from '@/lib/date'
import { countsForAverage, dayStatus, daySummary, freeCount } from '@/diet/day'
import { waterMet } from '@/diet/water'
import { since30 } from './chart'

/** cartão Dieta e conquistas de dieta (§157, §167): com cardápio ou com algum dia registrado */
export const hasDiet = (plan: DietPlan, log: DietLog) => plan.menus.length > 0 || Object.keys(log).length > 0

export const firstDietDate = (log: DietLog, water: WaterLog): string | undefined => [...Object.keys(log), ...Object.keys(water)].sort()[0]

export interface DietStats { avgKcal?: number; avgGoal?: number; fullDays: number; waterDays?: number; freeUses: number; days: number }

/** números de [from, to] (cartão Dieta e PDF); começa no 1º registro de dieta ou água se ele vier depois de `from` */
export function dietStats(log: DietLog, water: WaterLog, from: string, to: string): DietStats {
  const first = firstDietDate(log, water)
  const start = first && first > from ? first : from
  const inRange = (k: string) => k >= start && k <= to
  const kcal: number[] = []
  const goals: number[] = []
  let fullDays = 0, frees = 0
  for (const [k, day] of Object.entries(log)) {
    if (!inRange(k)) continue
    if (dayStatus(log, k) === 'full') fullDays++
    frees += freeCount(day)
    if (!countsForAverage(day)) continue
    kcal.push(daySummary(day).kcal)
    if (day.goalKcal) goals.push(day.goalKcal)
  }
  const avg = (l: number[]) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : undefined)
  const waterDays = Object.keys(water).filter(inRange)
  return {
    avgKcal: avg(kcal),
    avgGoal: avg(goals),
    fullDays,
    waterDays: waterDays.length ? waterDays.filter((k) => waterMet(water[k])).length : undefined,
    freeUses: frees,
    days: first ? Math.max(0, daysBetween(start, to) + 1) : 0,
  }
}

/** últimos 30 dias incluindo hoje (hoje entra ao vivo; as conquistas só olham dias fechados); água só com registro na janela */
export const dietStats30 = (log: DietLog, water: WaterLog, today: string) => dietStats(log, water, since30(today), today)

export function dietSummary(log: DietLog, water: WaterLog, today: string): string | undefined {
  const s = dietStats30(log, water, today)
  return s.days ? `${s.fullDays} de ${s.days} dias no plano` : undefined
}
