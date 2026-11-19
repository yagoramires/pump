import type { WorkoutSession } from './types'

/** descanso marcado é gravado como uma sessão vazia (formato salvo nos aparelhos) */
export const restRecord = (date: string): WorkoutSession => ({ date, workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true })

export const isRest = (s: WorkoutSession | undefined) => !!s?.rest
/** dia de descanso: marcado e sem treino concluído por cima */
export const isRestDay = (s: WorkoutSession | undefined) => isRest(s) && !s?.completedAt
