import { countInWeekBefore } from '../lib/date'
import type { WorkoutLog, WorkoutSession } from './types'

/** descanso marcado é gravado como uma sessão vazia (formato salvo nos aparelhos) */
export const restRecord = (date: string): WorkoutSession => ({ date, workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true })

export const isRest = (s: WorkoutSession | undefined) => !!s?.rest

/** o 1º descanso marcado da semana (domingo a sábado) não quebra a sequência */
export const neutralRest = (log: WorkoutLog, date: string) => isRest(log[date]) && countInWeekBefore(log, date, (s) => (isRest(s) ? 1 : 0)) === 0
