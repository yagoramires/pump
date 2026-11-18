export type Goal = 'hipertrofia' | 'emagrecer' | 'forca' | 'saude'
export type Level = 'iniciante' | 'intermediario' | 'avancado'
export type Place = 'academia' | 'casa'
export type Split = 'fullbody' | 'ab' | 'abc' | 'abcd' | 'abcde' | 'ppl'
export type Extra = 'cardio' | 'abdomen' | 'mobilidade'
export type Muscle = 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps' | 'pernas' | 'gluteos' | 'panturrilha'
export interface Anamnesis { goal?: Goal; level?: Level; place?: Place; daysPerWeek?: number; split?: Split; extras?: Extra[]; weak?: Muscle[]; age?: number; minutes?: number; notes?: string }
export interface Exercise { id: string; name: string; muscles: string[]; equipment: string; instructions: string[]; images: string[] }
export interface PlanExercise {
  exerciseId: string
  name: string
  muscles: string[]
  images: string[]
  instructions: string[]
  sets: number
  reps: string
  weightKg: number
  restSec: number
  custom?: boolean
  note?: string
}
/** label = letra 'A', 'B'… */
export interface Workout { id: string; label: string; name: string; weekdays: number[]; exercises: PlanExercise[] }
export interface WorkoutPlan { workouts: Workout[] }
export interface SetDone { reps: string; weightKg: number }
/** sets.length = séries planejadas */
export type SessionExercise = Omit<PlanExercise, 'sets'> & { sets: (SetDone | null)[] }
export interface WorkoutSession {
  date: string
  workoutId: string
  workoutLabel: string
  workoutName: string
  exercises: SessionExercise[]
  restEndsAt?: number
  startedAt?: string
  completedAt?: string
  /** descanso marcado: sem exercícios e sem completedAt */
  rest?: boolean
}
/** chave = date */
export type WorkoutLog = Record<string, WorkoutSession>
/** id 'custom-<uuid>' */
export interface CustomExercise { id: string; name: string; muscles: string[]; note?: string }
