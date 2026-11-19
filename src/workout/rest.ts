import type { WorkoutSession } from './types'

/** descanso marcado é gravado como uma sessão vazia (formato salvo nos aparelhos) */
export const restRecord = (date: string): WorkoutSession => ({ date, workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true })

export const isRest = (s: WorkoutSession | undefined) => !!s?.rest
/** o registro do dia quando é treino, não descanso */
export const sessionOf = (s: WorkoutSession | undefined) => (s && !isRest(s) ? s : undefined)
