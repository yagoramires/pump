import type { Anamnesis } from '@/workout/types'
import type { DietAnamnesis } from '@/diet/types'

export type DietGoal = 'perder-rapido' | 'perder' | 'manter' | 'ganhar' | 'ganhar-rapido'
export type Sex = 'M' | 'F'
export type Focus = 'hipertrofia' | 'forca' | 'condicionamento'
export interface Profile { sex: Sex; heightCm: number; age?: number; wake?: string; train?: string; sleep?: string; daysPerWeek?: number; notes?: string; dietGoal?: DietGoal; focus?: Focus; anamnesis?: Anamnesis; dietAnamnesis?: DietAnamnesis }
