import { isObj } from '@/lib/utils'
// só tipos das features: importar valores daqui criaria o ciclo schema → feature → db → schema
import type { Profile } from './profile/types'
import type { CustomExercise, WorkoutLog, WorkoutPlan } from './workout/types'
import type { DietItem, DietLog, DietPlan, WaterLog, WaterSettings } from './diet/types'
import type { Measurement, PhotoSet } from './evolution/types'

export type Tab = 'treino' | 'evolucao' | 'dieta'

/** datas = todayKey */
interface CoreSettings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean }
export type Settings = CoreSettings & { seenAchievements?: string[]; earnedAchievements?: Record<string, string>; shoppingChecked?: string[]; water?: WaterSettings; checkInDay?: number; anamnesisAt?: string }
export interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings; measurements: Measurement[]; photoSets: PhotoSet[]; dietPlan: DietPlan; dietLog: DietLog; waterLog: WaterLog; foods: DietItem[] }

const deepFreeze = <T,>(o: T): T => {
  Object.values(o as object).forEach((v) => typeof v === 'object' && v !== null && deepFreeze(v))
  return Object.freeze(o)
}

/** valor de cada chave antes da primeira gravação (profile com heightCm 0 = ainda não preenchido); congelado porque o store entrega por referência */
export const DEFAULTS = deepFreeze({
  profile: { sex: 'M', heightCm: 0 },
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
} satisfies UserData)

export const USER_KEYS = Object.keys(DEFAULTS) as (keyof UserData)[]
export const isUserKey = (k: string): k is keyof UserData => (USER_KEYS as readonly string[]).includes(k)

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
