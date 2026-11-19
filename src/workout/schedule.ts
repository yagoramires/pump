import type { Workout, WorkoutLog, WorkoutPlan, WorkoutSession } from './types'
import { isUnfinishedWorkout } from './session'
import { completedSessions } from './stats'

export const nextWorkout = (plan: WorkoutPlan, log: WorkoutLog): Workout | undefined => {
  const last = completedSessions(log).at(-1)
  const i = last ? plan.workouts.findIndex((w) => w.id === last.workoutId) : -1
  return plan.workouts[i < 0 ? 0 : (i + 1) % plan.workouts.length]
}

/** sessão de dia anterior, posterior à última concluída, com série marcada que ficou sem concluir (as mais antigas ficam como estão) */
export const unfinishedSession = (log: WorkoutLog, today: string): WorkoutSession | undefined => {
  const lastDone = completedSessions(log).at(-1)?.date ?? ''
  return Object.values(log)
    .filter((s) => s.date > lastDone && s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)
}
