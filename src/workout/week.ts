import { addDays, mondayWeekStart } from '@/lib/date'
import { completedSessions } from './stats'
import type { WorkoutSession } from './types'

/** dias de treino por semana do perfil; sem ele, um por treino do plano */
export const weeklyGoal = (daysPerWeek: number | undefined, workouts: number) => Math.min(7, Math.max(1, daysPerWeek ?? workouts))

/** dias com sessão concluída (ficha ou extra): dois treinos no mesmo dia contam um */
export const trainedDays = (sessions: WorkoutSession[]) => new Set(completedSessions(sessions).map((s) => s.date))

/** dias com treino na semana (seg–dom) de `date`, até `upTo` inclusive (padrão: a semana toda) */
export function weekTrainedDays(days: Set<string>, date: string, upTo = addDays(mondayWeekStart(date), 6)): number {
  let n = 0
  for (let k = mondayWeekStart(date), i = 0; i < 7 && k <= upTo; k = addDays(k, 1), i++) if (days.has(k)) n++
  return n
}
