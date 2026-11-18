import type { Workout, WorkoutLog, WorkoutPlan, WorkoutSession } from './types'

const byRecent = (a: WorkoutSession, b: WorkoutSession) => a.date.localeCompare(b.date) || (a.completedAt ?? '').localeCompare(b.completedAt ?? '')

/** o treino seguinte ao da última sessão concluída, com volta ao começo */
export const nextWorkout = (plan: WorkoutPlan, log: WorkoutLog): Workout | undefined => {
  const last = Object.values(log).filter((s) => s.completedAt && !s.rest).sort(byRecent).at(-1)
  const i = last ? plan.workouts.findIndex((w) => w.id === last.workoutId) : -1
  return plan.workouts[i < 0 ? 0 : (i + 1) % plan.workouts.length]
}

/** sessão de dia anterior, posterior à última concluída, com série marcada que ficou sem concluir (as mais antigas ficam como estão) */
export const unfinishedSession = (log: WorkoutLog, today: string): WorkoutSession | undefined => {
  const lastDone = Object.values(log).filter((s) => s.completedAt && !s.rest).sort(byRecent).at(-1)?.date ?? ''
  return Object.values(log)
    .filter((s) => s.date > lastDone && s.date < today && !s.completedAt && !s.rest && s.exercises.some((e) => e.sets.some(Boolean)))
    .sort(byRecent)
    .at(-1)
}
