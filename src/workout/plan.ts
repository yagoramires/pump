import type { WorkoutPlan } from './types'
import { keepIdsByName } from '@/format/keepIds'

/** plano inteiro novo: o treino de mesma letra mantém o id, que é a posição dele na rotação (nextWorkout) */
export const savePlan = (prev: WorkoutPlan, next: WorkoutPlan): WorkoutPlan => ({
  ...next,
  workouts: keepIdsByName(prev.workouts, next.workouts, (w) => w.label),
})

/** o que o editor não deixa salvar porque a importação (planFormat) recusaria no "Ajustar com IA" */
export function planProblem(plan: WorkoutPlan): string | undefined {
  for (const w of plan.workouts) {
    if (!w.name.trim()) return `Treino ${w.label}: dê um nome ao treino`
    if (w.exercises.length === 0) return `Treino ${w.label}: adicione pelo menos um exercício`
    const noReps = w.exercises.find((e) => !e.reps.trim())
    if (noReps) return `Treino ${w.label}, ${noReps.name}: preencha as repetições`
  }
}
