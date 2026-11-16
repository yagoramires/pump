import type { Exercise, PlanExercise, Workout, WorkoutPlan } from '../src/types'

export const pe = (over: Partial<PlanExercise> = {}): PlanExercise => ({
  exerciseId: 'X', name: 'X', muscles: [], images: [], instructions: [], sets: 3, reps: '10', weightKg: 0, restSec: 90, ...over,
})

export const workoutOf = (exs: Partial<PlanExercise>[], over: Partial<Workout> = {}): Workout => ({
  id: 'w', label: 'A', name: 'Treino A', weekdays: [1], exercises: exs.map(pe), ...over,
})

export const planOf = (ws: Partial<Workout>[]): WorkoutPlan => ({
  workouts: ws.map((w) => workoutOf([], w)),
})

export const planWith = (exs: Partial<PlanExercise>[]): WorkoutPlan => ({ workouts: [workoutOf(exs)] })

export const ex = (name: string, over: Partial<Exercise> = {}): Exercise => ({
  id: name, name, muscles: [], equipment: 'barra', instructions: [], images: [], ...over,
})
