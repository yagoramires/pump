import type { WorkoutPlan } from './types'
import { keepIdsByName } from '@/format/keepIds'

/** plano inteiro novo: o treino de mesma letra mantém o id, que é a posição dele na rotação (nextWorkout) */
export const savePlan = (prev: WorkoutPlan, next: WorkoutPlan): WorkoutPlan => ({
  ...next,
  workouts: keepIdsByName(prev.workouts, next.workouts, (w) => w.label),
})

