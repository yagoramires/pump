import type { CustomExercise, Exercise, PlanExercise } from './types'

export const PLAN_DEFAULTS = { sets: 3, reps: '10-12', weightKg: 0, restSec: 90 }

/** exercício criado pelo usuário: sem fotos, id `custom-<uuid>` */
export const isCustom = (e: Exercise | CustomExercise): e is CustomExercise => !('images' in e)

export const newCustomExercise = (name: string, muscles: string[], note?: string): CustomExercise => ({ id: `custom-${crypto.randomUUID()}`, name, muscles, ...(note && { note }) })

export function toPlanExercise(e: Exercise | CustomExercise): PlanExercise {
  const base = { exerciseId: e.id, name: e.name, muscles: e.muscles, ...PLAN_DEFAULTS }
  return isCustom(e)
    ? { ...base, custom: true, images: [], instructions: [], note: e.note }
    : { ...base, images: e.images, instructions: e.instructions }
}
