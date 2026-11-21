export type { Exercise } from '@/catalog/types'
export type Level = 'iniciante' | 'intermediario' | 'avancado'
export type Place = 'academia' | 'casa'
export type Split = 'fullbody' | 'ab' | 'abc' | 'abcd' | 'abcde' | 'ppl'
export type Extra = 'cardio' | 'abdomen' | 'mobilidade'
export type Muscle = 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps' | 'pernas' | 'gluteos' | 'panturrilha'
export interface Anamnesis { level?: Level; place?: Place; split?: Split; extras?: Extra[]; weak?: Muscle[]; minutes?: number }
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
export interface Workout { id: string; label: string; name: string; exercises: PlanExercise[] }
export interface WorkoutPlan {
  workouts: Workout[]
  /** escolhido no import; vale até o primeiro treino concluído depois de `since` (ISO) */
  start?: { label: string; since: string }
}
export interface SetDone { reps: string; weightKg: number }
/** sets.length = séries planejadas */
/** skipped = índices das séries marcadas "não fiz" (ficam null em sets) */
export type SessionExercise = Omit<PlanExercise, 'sets'> & { sets: (SetDone | null)[]; skipped?: number[] }
export interface WorkoutSession {
  date: string
  workoutId: string
  workoutLabel: string
  workoutName: string
  exercises: SessionExercise[]
  restEndsAt?: number
  /** exercício do descanso em curso (sobrevive à recarga); ausente em sessões antigas */
  restExIdx?: number
  /** descanso pausado: restante em ms (restEndsAt fica vazio) */
  restPausedLeftMs?: number
  startedAt?: string
  completedAt?: string
  /** hora da última série resolvida (feita ou pulada); a duração termina aqui */
  endedAt?: string
  /** esforço percebido do treino, 1 a 10 */
  effort?: number
  /** hora do fim original enquanto as séries são editadas depois de concluir */
  editedFrom?: string
  /** descanso marcado: sem exercícios e sem completedAt */
  rest?: boolean
}
/** chave = date */
export type WorkoutLog = Record<string, WorkoutSession>
/** id 'custom-<uuid>' */
export interface CustomExercise { id: string; name: string; muscles: string[]; note?: string }
