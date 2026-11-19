// o texto de "reps" é livre: "10", "8-12", "12-10-8", "30 s", "20 min"; toda leitura dele mora aqui

// shortcut: cardio = 1 série com duração em minutos ("15 min", "20-30 min"), como o prompt pede; se precisar marcar cardio na mão, vira um campo do exercício
type ExerciseShape = { sets: number | unknown[]; reps: string }

export const CARDIO_REPS_RULE = 'no cardio use "series": 1 e o tempo em "reps", como "20 min"'

export const isCardio = (e: ExerciseShape): boolean =>
  (typeof e.sets === 'number' ? e.sets : e.sets.length) === 1 && /^\s*\d+(\s*(-|–|a)\s*\d+)?\s*min(utos)?\s*$/i.test(e.reps)

export const isTimed = (reps: string): boolean => /\d+\s*(s|seg(undos)?|min(utos)?)\b/i.test(reps)

/** o primeiro número: "8-12" conta 8 */
export const repsNumber = (reps: string): number => Number(/\d+/.exec(reps)?.[0] ?? 0)

/** "12-10-8" com uma conta por série; dois números separados por hífen são uma faixa, como 8–12 */
export function repsPerSet(reps: string, sets: number): string[] | undefined {
  const sequence = reps.trim().split(/\s*[-–—]\s*/)
  return sequence.length >= 3 && sequence.length === sets && sequence.every((v) => /^\d+$/.test(v)) ? sequence : undefined
}

/** força primeiro, cardio depois, cada um com a posição original */
export function groupExercises<T extends ExerciseShape>(exercises: T[]) {
  const strength: { exercise: T; index: number }[] = []
  const cardio: typeof strength = []
  exercises.forEach((exercise, index) => (isCardio(exercise) ? cardio : strength).push({ exercise, index }))
  return [{ cardio: false, items: strength }, { cardio: true, items: cardio }] as const
}
