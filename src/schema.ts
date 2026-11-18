// só tipos das features: importar valores daqui criaria o ciclo schema → feature → db → schema
import type { Tab } from './types'
import type { Profile } from './profile/types'
import type { CustomExercise, WorkoutLog, WorkoutPlan } from './workout/types'
import type { DietItem, DietLog, DietPlan, WaterLog, WaterSettings } from './diet/types'
import type { Measurement, PhotoSet } from './evolution/types'

/** datas = todayKey */
interface CoreSettings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean }
export type Settings = CoreSettings & { seenAchievements?: string[]; water?: WaterSettings }
export interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings; measurements: Measurement[]; photoSets: PhotoSet[]; dietPlan: DietPlan; dietLog: DietLog; waterLog: WaterLog; foods: DietItem[] }

/** valor de cada chave antes da primeira gravação (profile com heightCm 0 = ainda não preenchido) */
export const DEFAULTS = {
  profile: { sex: 'M', heightCm: 0, weightKg: 0 },
  workoutPlan: { workouts: [] },
  workoutLog: {},
  customExercises: [],
  settings: { lastTab: 'treino', onboardingDone: false },
  measurements: [],
  photoSets: [],
  dietPlan: { menus: [] },
  dietLog: {},
  waterLog: {},
  foods: [],
} satisfies UserData

export const USER_KEYS = Object.keys(DEFAULTS) as (keyof UserData)[]

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** formato mínimo que um backup precisa ter em cada chave */
export const VALID: Record<keyof UserData, (v: unknown) => boolean> = {
  profile: isObj,
  workoutPlan: (v) => isObj(v) && Array.isArray(v.workouts),
  workoutLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && Array.isArray(d.exercises)),
  customExercises: Array.isArray,
  settings: isObj,
  measurements: Array.isArray,
  photoSets: Array.isArray,
  dietPlan: (v) => isObj(v) && Array.isArray(v.menus),
  dietLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && Array.isArray(d.meals)),
  waterLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && typeof d.ml === 'number' && typeof d.goalMl === 'number'),
  foods: Array.isArray,
}
