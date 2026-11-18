import type { Anamnesis } from '@/workout/types'
import type { DietAnamnesis } from '@/diet/types'

export type Sex = 'M' | 'F'
export interface Profile { sex: Sex; heightCm: number; weightKg: number; anamnesis?: Anamnesis; dietAnamnesis?: DietAnamnesis }
