import { isObj } from '@/lib/utils'
// só tipos das features: importar valores daqui criaria o ciclo schema → feature → db → schema
import type { Profile } from './profile/types'
import type { CustomExercise, WorkoutLog, WorkoutPlan } from './workout/types'
import type { DietItem, DietLog, DietPlan, Supplement, SupplementLog, WaterLog, WaterSettings } from './diet/types'
import type { Measurement, PhotoSet } from './evolution/types'

export type Tab = 'treino' | 'evolucao' | 'dieta'
export const THEMES = ['dark', 'light', 'system'] as const
export type Theme = (typeof THEMES)[number]

/** datas = todayKey */
interface CoreSettings { lastTab: Tab; onboardingDone: boolean; firstUseAt?: string; lastBackupAt?: string; installDismissed?: boolean; seenChangelog?: number; theme?: Theme; muted?: boolean }
export type Settings = CoreSettings & { seenAchievements?: string[]; earnedAchievements?: Record<string, string>; shoppingChecked?: string[]; water?: WaterSettings; supplements?: Supplement[]; checkInDay?: number; anamnesisAt?: string }
export interface UserData { profile: Profile; workoutPlan: WorkoutPlan; workoutLog: WorkoutLog; extraLog: WorkoutLog; customExercises: CustomExercise[]; settings: Settings; measurements: Measurement[]; photoSets: PhotoSet[]; dietPlan: DietPlan; dietLog: DietLog; waterLog: WaterLog; supplementLog: SupplementLog; foods: DietItem[] }

const deepFreeze = <T,>(o: T): T => {
  Object.values(o as object).forEach((v) => typeof v === 'object' && v !== null && deepFreeze(v))
  return Object.freeze(o)
}

/** valor de cada chave antes da primeira gravação (profile com heightCm 0 = ainda não preenchido); congelado porque o store entrega por referência */
export const DEFAULTS = deepFreeze({
  profile: { sex: 'M', heightCm: 0 },
  workoutPlan: { workouts: [] },
  workoutLog: {},
  extraLog: {},
  customExercises: [],
  settings: { lastTab: 'treino', onboardingDone: false },
  measurements: [],
  photoSets: [],
  dietPlan: { menus: [] },
  dietLog: {},
  waterLog: {},
  supplementLog: {},
  foods: [],
} satisfies UserData)

export const USER_KEYS = Object.keys(DEFAULTS) as (keyof UserData)[]
export const isUserKey = (k: string): k is keyof UserData => (USER_KEYS as readonly string[]).includes(k)

// byDate ordena por date no boot: item sem date travaria o app inteiro depois de restaurar
const datedList = (v: unknown) => Array.isArray(v) && v.every((d) => isObj(d) && typeof d.date === 'string')

// sem date o anterior/a nota ordenam por date e travariam a aba Treino depois de restaurar
const validWorkoutLog = (v: unknown) => isObj(v) && Object.values(v).every((d) => isObj(d) && typeof d.date === 'string' && Array.isArray(d.exercises))

/** formato mínimo que um backup precisa ter em cada chave */
export const VALID: Record<keyof UserData, (v: unknown) => boolean> = {
  profile: isObj,
  workoutPlan: (v) => isObj(v) && Array.isArray(v.workouts),
  workoutLog: validWorkoutLog,
  extraLog: validWorkoutLog,
  customExercises: Array.isArray,
  // supplements vira .map na aba Dieta: formato errado travaria o app a cada abertura
  // theme entra pelo backup: valor desconhecido deixaria o app sem tema
  settings: (v) => isObj(v) && (v.theme === undefined || (THEMES as readonly unknown[]).includes(v.theme)) && (v.supplements === undefined || (Array.isArray(v.supplements) && v.supplements.every((x) => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string'))),
  measurements: datedList,
  photoSets: datedList,
  dietPlan: (v) => isObj(v) && Array.isArray(v.menus),
  dietLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && Array.isArray(d.meals)),
  waterLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && typeof d.ml === 'number' && typeof d.goalMl === 'number'),
  supplementLog: (v) => isObj(v) && Object.values(v).every((d) => isObj(d) && Array.isArray(d.taken) && typeof d.total === 'number'),
  foods: Array.isArray,
}
