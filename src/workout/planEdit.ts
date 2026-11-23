import { arrayMove } from '@dnd-kit/sortable'
import type { PlanExercise, Workout, WorkoutPlan } from './types'
import { GROUPS, muscleGroup } from '@/catalog/muscles'
import { isCardio } from './reps'

/** `key` só existe no editor: é o id de cada linha pra arrastar e nunca vai pro plano salvo */
export type Keyed = PlanExercise & { key: string }
export type EditorWorkout = Omit<Workout, 'exercises'> & { exercises: Keyed[] }
export type EditorPlan = Omit<WorkoutPlan, 'workouts'> & { workouts: EditorWorkout[] }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const toEditor = (plan: WorkoutPlan): EditorPlan => ({
  ...plan,
  workouts: plan.workouts.map((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...e, key: crypto.randomUUID() })) })),
})

export const fromEditor = (plan: EditorPlan): WorkoutPlan => ({
  ...plan,
  workouts: plan.workouts.map((w) => ({ ...w, exercises: w.exercises.map(({ key: _key, ...e }) => e) })),
})

/** letra pela posição; o `start` do import continua apontando pro mesmo treino (pelo id) */
export function relabel<P extends { workouts: { id: string; label: string }[]; start?: { label: string; since: string } }>(plan: P): P {
  const startId = plan.start && plan.workouts.find((w) => w.label === plan.start!.label)?.id
  const workouts = plan.workouts.map((w, i) => ({ ...w, label: LETTERS[i] }))
  const label = workouts.find((w) => w.id === startId)?.label
  const { start, ...rest } = plan
  return { ...rest, workouts, ...(start && label && { start: { ...start, label } }) } as P
}

export const moveWorkout = (plan: EditorPlan, from: number, to: number): EditorPlan =>
  relabel({ ...plan, workouts: arrayMove(plan.workouts, from, to) })

export const removeWorkout = (plan: EditorPlan, id: string): EditorPlan =>
  relabel({ ...plan, workouts: plan.workouts.filter((w) => w.id !== id) })

export function addWorkout(plan: EditorPlan): EditorPlan {
  const label = LETTERS[plan.workouts.length]
  if (!label) return plan
  // relabel: plano antigo pode ter letra pulada (A, C) e a nova repetiria a última
  return relabel({ ...plan, workouts: [...plan.workouts, { id: crypto.randomUUID(), label, name: `Treino ${label}`, exercises: [] }] })
}

/** `to.index` é a posição na lista de destino depois de tirar o item da origem */
export function moveExercise(plan: EditorPlan, from: { wid: string; index: number }, to: { wid: string; index: number }): EditorPlan {
  const item = plan.workouts.find((w) => w.id === from.wid)?.exercises[from.index]
  if (!item) return plan
  const workouts = plan.workouts.map((w) => (w.id === from.wid ? { ...w, exercises: w.exercises.filter((_, i) => i !== from.index) } : w))
  return {
    ...plan,
    workouts: workouts.map((w) => {
      if (w.id !== to.wid) return w
      const exercises = [...w.exercises]
      exercises.splice(to.index, 0, item)
      return { ...w, exercises }
    }),
  }
}

export function muscleSplit(exercises: PlanExercise[]): { token: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of exercises) if (!isCardio(e)) counts.set(muscleGroup(e.muscles), (counts.get(muscleGroup(e.muscles)) ?? 0) + 1)
  return GROUPS.filter((g) => counts.has(g.token))
    .map((g) => ({ token: g.token, label: g.label.toLowerCase(), count: counts.get(g.token)! }))
    .sort((a, b) => b.count - a.count) // sort estável: empate fica na ordem de GROUPS
}
