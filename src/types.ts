export type Tab = 'treino' | 'evolucao' | 'dieta'

export type Sex = 'M' | 'F'
export type Goal = 'hipertrofia' | 'emagrecer' | 'forca' | 'saude'
export type Level = 'iniciante' | 'intermediario' | 'avancado'
export type Place = 'academia' | 'casa'
export type Split = 'fullbody' | 'ab' | 'abc' | 'abcd' | 'abcde' | 'ppl'
export type Extra = 'cardio' | 'abdomen' | 'mobilidade'
export type Muscle = 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps' | 'pernas' | 'gluteos' | 'panturrilha'
/** respostas da anamnese que vão no prompt da IA; tudo opcional */
export interface Anamnesis { goal?: Goal; level?: Level; place?: Place; daysPerWeek?: number; split?: Split; extras?: Extra[]; weak?: Muscle[]; age?: number; minutes?: number; notes?: string }
export interface Profile { sex: Sex; heightCm: number; weightKg: number; anamnesis?: Anamnesis; dietAnamnesis?: DietAnamnesis }
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
  /** descanso marcado: sem exercícios e sem completedAt */
  rest?: boolean
}
/** chave = date */
export type WorkoutLog = Record<string, WorkoutSession>
/** id 'custom-<uuid>' */
export interface CustomExercise { id: string; name: string; muscles: string[]; note?: string }
/** datas = todayKey */
export interface Settings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean; seenAchievements?: string[]; water?: WaterSettings }
export type Angle = 'frente' | 'lado' | 'costas'
export interface MeasureFields { weightKg?: number; neckCm?: number; waistCm?: number; hipCm?: number; armCm?: number; chestCm?: number; thighCm?: number }
export interface Measurement extends MeasureFields { id: string; date: string }
/** valores dos ângulos = id da foto (chave photo:<id>) */
export interface PhotoSet { id: string; date: string; frente?: string; lado?: string; costas?: string }
export interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings; measurements: Measurement[]; photoSets: PhotoSet[]; dietPlan: DietPlan; dietLog: DietLog; waterLog: WaterLog; foods: DietItem[] }
export const USER_KEYS = ['profile', 'workoutPlan', 'workoutLog', 'customExercises', 'settings', 'measurements', 'photoSets', 'dietPlan', 'dietLog', 'waterLog', 'foods'] as const
export const DEFAULT_SETTINGS: Settings = { lastTab: 'treino', onboardingDone: false }

export interface Per100 { kcal: number; p: number; c: number; f: number }
export interface DietItem { id: string; name: string; grams: number; portion?: string; per100: Per100; source: 'taco' | 'custom' | 'ia'; tacoId?: number }
export interface Macros { p: number; c: number; f: number }
export interface MealOption { id: string; name?: string; items: DietItem[] }
export interface Meal { id: string; name: string; time: string; options: MealOption[] }
export interface Menu { id: string; name: string; meals: Meal[]; goalKcal?: number; goalMacros?: Macros }
export interface DietPlan { menus: Menu[]; lastMenuId?: string }
/** original = item do cardápio antes da 1ª troca (pra desfazer) */
export interface DayItem extends DietItem { skipped?: boolean; swappedFrom?: string; extra?: boolean; original?: DietItem }
/** swappedMeal = nome da opção/refeição escolhida em "Trocar refeição" */
export interface DayMeal extends Omit<Meal, 'options'> { done: boolean; free?: boolean; swappedMeal?: string; items: DayItem[] }
export interface DietDay { menuId: string; menuName: string; meals: DayMeal[]; goalKcal?: number; goalMacros?: Macros; free?: boolean }
/** chave = todayKey */
export type DietLog = Record<string, DietDay>
export interface WaterDay { ml: number; goalMl: number }
export type WaterLog = Record<string, WaterDay>
export type DietGoal = 'perder-rapido' | 'perder' | 'manter' | 'ganhar' | 'ganhar-rapido'
export type Restriction = 'lactose' | 'gluten' | 'vegetariano' | 'vegano'
export interface DietAnamnesis { goal: DietGoal; meals?: number; wake?: string; train?: string; sleep?: string; restrictions?: Restriction[]; avoid?: string; eatOut?: 'casa' | 'fora' | 'misto'; notes?: string }
export interface WaterSettings { enabled: boolean; goalMl: number; cupMl: number }
export interface TacoFood { id: number; name: string; kcal: number; p: number; c: number; f: number }
export const EMPTY_DIET: DietPlan = { menus: [] }
