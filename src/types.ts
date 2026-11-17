export type Tab = 'treino' | 'evolucao' | 'dieta'

export type Sex = 'M' | 'F'
export type Goal = 'hipertrofia' | 'emagrecer' | 'forca' | 'saude'
export type Level = 'iniciante' | 'intermediario' | 'avancado'
export type Place = 'academia' | 'casa'
/** respostas da anamnese que vão no prompt da IA; tudo opcional */
export interface Anamnesis { goal?: Goal; level?: Level; place?: Place; daysPerWeek?: number; age?: number; minutes?: number; notes?: string }
export interface Profile { sex: Sex; heightCm: number; weightKg: number; anamnesis?: Anamnesis }
/** perfil ainda não preenchido (heightCm 0 = vazio) */
export const NO_PROFILE: Profile = { sex: 'M', heightCm: 0, weightKg: 0 }
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
}
/** chave = date */
export type WorkoutLog = Record<string, WorkoutSession>
/** id 'custom-<uuid>' */
export interface CustomExercise { id: string; name: string; muscles: string[]; note?: string }
/** datas = todayKey */
export interface Settings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean }
export interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings }
export const USER_KEYS = ['profile', 'workoutPlan', 'workoutLog', 'customExercises', 'settings'] as const
export const DEFAULT_SETTINGS: Settings = { lastTab: 'treino', onboardingDone: false }
