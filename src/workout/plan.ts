import type { WorkoutPlan } from './types'
import { keepIdsByName } from '@/format/keepIds'

/** plano inteiro novo: o treino de mesmo nome mantém o id (e com ele o histórico e a posição na rotação), mesmo que
 * tenha mudado de letra num arquivo reordenado; quem sobrar casa pela letra */
export const savePlan = (prev: WorkoutPlan, next: WorkoutPlan): WorkoutPlan => ({
  ...next,
  workouts: keepIdsByName(prev.workouts, keepIdsByName(prev.workouts, next.workouts, (w) => w.name), (w) => w.label),
})

