import type { Anamnesis } from '@/workout/types'
import type { DietAnamnesis } from '@/diet/types'

export type DietGoal = 'perder-rapido' | 'perder' | 'manter' | 'ganhar' | 'ganhar-rapido'
export type Sex = 'M' | 'F'
export type Focus = 'hipertrofia' | 'forca' | 'condicionamento'
export const DIET_GOAL_LABEL: Record<DietGoal, string> = { 'perder-rapido': 'Perder rápido', perder: 'Perder peso', manter: 'Manter', ganhar: 'Ganhar peso', 'ganhar-rapido': 'Ganhar rápido' }
export const DIET_GOAL_PROMPT_LABEL: Record<DietGoal, string> = {
  'perder-rapido': `${DIET_GOAL_LABEL.perder.toLowerCase()} rápido`,
  perder: DIET_GOAL_LABEL.perder.toLowerCase(),
  manter: `${DIET_GOAL_LABEL.manter.toLowerCase()} o peso`,
  ganhar: DIET_GOAL_LABEL.ganhar.toLowerCase(),
  'ganhar-rapido': `${DIET_GOAL_LABEL.ganhar.toLowerCase()} rápido`,
}
export const SEX_LABEL: Record<Sex, string> = { M: 'Masculino', F: 'Feminino' }
export const FOCUS_LABEL: Record<Focus, string> = { hipertrofia: 'Hipertrofia', forca: 'Força', condicionamento: 'Condicionamento' }

export interface Profile { sex: Sex; heightCm: number; age?: number; wake?: string; train?: string; sleep?: string; daysPerWeek?: number; notes?: string; dietGoal?: DietGoal; focus?: Focus; anamnesis?: Anamnesis; dietAnamnesis?: DietAnamnesis }
