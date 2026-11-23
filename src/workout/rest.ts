import type { WorkoutLog, WorkoutSession } from './types'

/** descanso marcado é gravado como uma sessão vazia (formato salvo nos aparelhos) */
export const restRecord = (date: string): WorkoutSession => ({ date, workoutId: '', workoutLabel: '', workoutName: 'Descanso', exercises: [], rest: true })

export const isRest = (s: WorkoutSession | undefined) => !!s?.rest
/** o registro do dia quando é treino, não descanso */
export const sessionOf = (s: WorkoutSession | undefined) => (s && !isRest(s) ? s : undefined)

/** sessão que começa num dia com descanso marcado guarda isso, pra devolver o descanso se for cancelada */
export const carryRest = (prev: WorkoutSession | undefined, started: WorkoutSession): WorkoutSession =>
  isRest(prev) || prev?.replacesRest ? { ...started, replacesRest: true } : started

/** cancelar ou descartar a sessão em curso: volta o descanso que ela substituiu, ou o dia fica vazio */
export const dropSession = (log: WorkoutLog, s: WorkoutSession): WorkoutLog => {
  const { [s.date]: _gone, ...rest } = log
  return s.replacesRest ? { ...rest, [s.date]: restRecord(s.date) } : rest
}
