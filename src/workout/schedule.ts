import type { Workout, WorkoutLog, WorkoutPlan, WorkoutSession } from './types'
import { isUnfinishedWorkout } from './session'
import { completedSessions } from './stats'

export const nextWorkout = (plan: WorkoutPlan, log: WorkoutLog): Workout | undefined => {
  const done = completedSessions(Object.values(log))
  const { start } = plan
  // conta o início: treino começado antes do import e reaberto/concluído depois não cancela a escolha
  const chosen = start && !done.some((s) => (s.startedAt ?? s.completedAt)! > start.since) && plan.workouts.find((w) => w.label === start.label)
  if (chosen) return chosen
  const last = done.at(-1)
  const i = last ? plan.workouts.findIndex((w) => w.id === last.workoutId) : -1
  return plan.workouts[i < 0 ? 0 : (i + 1) % plan.workouts.length]
}

/** sessão de dia anterior, posterior à última concluída, com série marcada que ficou sem concluir (as mais antigas ficam como estão) */
export const unfinishedSession = (log: WorkoutLog, today: string): WorkoutSession | undefined => {
  const lastDone = completedSessions(Object.values(log)).at(-1)?.date ?? ''
  return Object.values(log)
    .filter((s) => s.date > lastDone && s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)
}
