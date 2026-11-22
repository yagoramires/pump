import type { DietLog, DietPlan, WaterLog } from '@/diet/types'
import type { Profile } from '@/profile/types'
import type { WorkoutPlan, WorkoutSession } from '@/workout/types'

export type Angle = 'frente' | 'lado' | 'costas'
export const ANGLES = ['frente', 'lado', 'costas'] as const satisfies readonly Angle[]
export const ANGLE_LABEL: Record<Angle, string> = { frente: 'Frente', lado: 'Lado', costas: 'Costas' }
export interface MeasureFields { weightKg?: number; neckCm?: number; waistCm?: number; hipCm?: number; armCm?: number; chestCm?: number; thighCm?: number }
export interface Measurement extends MeasureFields { id: string; date: string }
/** valores dos ângulos = id da foto (chave photo:<id>) */
export interface PhotoSet { id: string; date: string; frente?: string; lado?: string; costas?: string }

export interface EvolutionInput {
  /** ficha e extras concluídos ou não; filtre com completedSessions */
  sessions: WorkoutSession[]
  workoutPlan: WorkoutPlan
  measurements: Measurement[]
  photoSets: PhotoSet[]
  profile: Profile
  dietLog: DietLog
  waterLog: WaterLog
  dietPlan: DietPlan
  /** id → data da 1ª vez que ganhou (settings): conquista ganha não some se o perfil mudar */
  earnedAchievements?: Record<string, string>
}
