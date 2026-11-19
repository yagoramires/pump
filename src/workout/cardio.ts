// shortcut: cardio = 1 série com duração em minutos ("15 min", "20-30 min"), como o prompt pede; se precisar marcar cardio na mão, vira um campo do exercício
type ExerciseShape = { sets: number | unknown[]; reps: string }

export const isCardio = (e: ExerciseShape): boolean =>
  (typeof e.sets === 'number' ? e.sets : e.sets.length) === 1 && /^\s*\d+(\s*(-|–|a)\s*\d+)?\s*min(utos)?\s*$/i.test(e.reps)

export const isTimed = (reps: string): boolean => /\d+\s*(s|seg(undos)?|min(utos)?)\b/i.test(reps)

export function groupExercises<T extends ExerciseShape>(exercises: T[]) {
  const strength: { exercise: T; index: number }[] = []
  const cardio: typeof strength = []
  exercises.forEach((exercise, index) => (isCardio(exercise) ? cardio : strength).push({ exercise, index }))
  return { strength, cardio }
}
