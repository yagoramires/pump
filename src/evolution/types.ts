import type { DietLog, DietPlan, WaterLog } from '@/diet/types'
import type { Profile } from '@/profile/types'
import type { WorkoutLog, WorkoutPlan } from '@/workout/types'

export type Angle = 'frente' | 'lado' | 'costas'
export const ANGLES = ['frente', 'lado', 'costas'] as const satisfies readonly Angle[]
export const ANGLE_LABEL: Record<Angle, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }
export interface MeasureFields { weightKg?: number; neckCm?: number; waistCm?: number; hipCm?: number; armCm?: number; chestCm?: number; thighCm?: number }
export interface Measurement extends MeasureFields { id: string; date: string }
/** valores dos ângulos = id da foto (chave photo:<id>) */
export interface PhotoSet { id: string; date: string; frente?: string; lado?: string; costas?: string }

export interface EvolutionInput {
  workoutLog: WorkoutLog
  workoutPlan: WorkoutPlan
  measurements: Measurement[]
  photoSets: PhotoSet[]
  profile: Profile
  dietLog: DietLog
  waterLog: WaterLog
  dietPlan: DietPlan
}
