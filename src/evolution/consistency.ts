import { addDays, daysBetween, mondayWeekStart } from '@/lib/date'
import { trainedDays, weekTrainedDays } from '@/workout/week'
import type { WorkoutSession } from '@/workout/types'

export interface WeekBar { start: string; days: number; ratio: number }

/** segundas-feiras da semana do 1º treino (ou de `limit` semanas atrás, se mais recente) até a de `today` */
function weekStarts(days: Set<string>, today: string, limit = Infinity): string[] {
  if (!days.size) return []
  const current = mondayWeekStart(today)
  const first = mondayWeekStart([...days].sort()[0])
  const oldest = limit === Infinity ? first : addDays(current, -7 * (limit - 1))
  const out: string[] = []
  for (let k = first > oldest ? first : oldest; k <= current; k = addDays(k, 7)) out.push(k)
  return out
}

/** dias treinados por semana; a média conta a semana atual proporcional aos dias já passados */
export function weeklyBars(sessions: WorkoutSession[], goal: number, today: string, weeks = 12): { bars: WeekBar[]; avgDays: number } {
  const days = trainedDays(sessions)
  const bars = weekStarts(days, today, weeks).map((start) => {
    const n = weekTrainedDays(days, start)
    return { start, days: n, ratio: Math.min(1, n / goal) }
  })
  if (!bars.length) return { bars, avgDays: 0 }
  const elapsed = (daysBetween(mondayWeekStart(today), today) + 1) / 7
  return { bars, avgDays: bars.reduce((a, b) => a + b.days, 0) / Math.max(1, bars.length - 1 + elapsed) }
}

/** semanas seguidas com a meta batida; a semana atual e a do 1º treino (parcial) só somam, nunca quebram */
export function goalStreak(sessions: WorkoutSession[], goal: number, today: string): { current: number; bestBefore: number } {
  const days = trainedDays(sessions)
  const starts = weekStarts(days, today)
  const current = mondayWeekStart(today)
  let run = 0
  let bestBefore = 0
  starts.forEach((start, i) => {
    if (weekTrainedDays(days, start) >= goal) run++
    else if (i > 0 && start !== current) { bestBefore = Math.max(bestBefore, run); run = 0 }
  })
  return { current: run, bestBefore }
}
