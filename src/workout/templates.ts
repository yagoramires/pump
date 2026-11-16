import type { CustomExercise, Exercise, PlanExercise, WorkoutPlan } from '../types'

export interface PlanTemplate {
  id: string
  name: string
  description: string
  workouts: { label: string; name: string; weekdays: number[]; exerciseIds: string[] }[]
}

export const PLAN_DEFAULTS = { sets: 3, reps: '10-12', weightKg: 0, restSec: 90 }

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip'
const INCLINE = 'Barbell_Incline_Bench_Press_-_Medium_Grip'
const PUSHDOWN = 'Triceps_Pushdown_-_Rope_Attachment'
const PULLDOWN = 'Wide-Grip_Lat_Pulldown'
const OHP = 'Dumbbell_Shoulder_Press'
const ROW = 'Seated_Cable_Rows'
const SQUAT = 'Barbell_Squat'
const LEGPRESS = 'Leg_Press'
const CURL = 'Lying_Leg_Curls'
const EXT = 'Leg_Extensions'
const CALF = 'Seated_Calf_Raise'
const LATERAL = 'Side_Lateral_Raise'
const BBROW = 'Bent_Over_Barbell_Row'
const BBCURL = 'Barbell_Curl'
const HAMMER = 'Hammer_Curls'
const THRUST = 'Barbell_Hip_Thrust'

export const TEMPLATES: PlanTemplate[] = [
  {
    id: 'fullbody',
    name: 'Fullbody 3×',
    description: 'Corpo inteiro, 3×/semana',
    workouts: [
      { label: 'A', name: 'Corpo inteiro', weekdays: [1, 3, 5], exerciseIds: [SQUAT, BENCH, PULLDOWN, OHP, 'Romanian_Deadlift', ROW, 'Plank'] },
    ],
  },
  {
    id: 'ab',
    name: 'AB',
    description: 'Empurrar e puxar + pernas, 4×/semana',
    workouts: [
      { label: 'A', name: 'Peito, ombro e tríceps', weekdays: [1, 4], exerciseIds: [BENCH, 'Dumbbell_Flyes', OHP, LATERAL, PUSHDOWN] },
      { label: 'B', name: 'Costas, bíceps e pernas', weekdays: [2, 5], exerciseIds: [PULLDOWN, ROW, BBCURL, SQUAT, LEGPRESS, CURL] },
    ],
  },
  {
    id: 'abc',
    name: 'ABC',
    description: 'Divisão clássica, 6×/semana',
    workouts: [
      { label: 'A', name: 'Peito, ombro e tríceps', weekdays: [1, 4], exerciseIds: [BENCH, INCLINE, 'Dumbbell_Flyes', OHP, LATERAL, PUSHDOWN] },
      { label: 'B', name: 'Costas e bíceps', weekdays: [2, 5], exerciseIds: [PULLDOWN, BBROW, ROW, 'One-Arm_Dumbbell_Row', BBCURL, HAMMER] },
      { label: 'C', name: 'Pernas', weekdays: [3, 6], exerciseIds: [SQUAT, LEGPRESS, EXT, CURL, 'Stiff-Legged_Barbell_Deadlift', CALF] },
    ],
  },
  {
    id: 'abcd',
    name: 'ABCD',
    description: 'Um grupo por dia, 4×/semana',
    workouts: [
      { label: 'A', name: 'Peito e tríceps', weekdays: [1], exerciseIds: [BENCH, INCLINE, 'Cable_Crossover', PUSHDOWN, 'EZ-Bar_Skullcrusher'] },
      { label: 'B', name: 'Costas e bíceps', weekdays: [2], exerciseIds: [PULLDOWN, BBROW, ROW, BBCURL, HAMMER] },
      { label: 'C', name: 'Pernas', weekdays: [4], exerciseIds: [SQUAT, LEGPRESS, EXT, CURL, THRUST, CALF] },
      { label: 'D', name: 'Ombros e abdômen', weekdays: [5], exerciseIds: [OHP, LATERAL, 'Seated_Bent-Over_Rear_Delt_Raise', 'Dumbbell_Shrug', 'Cable_Crunch', 'Plank'] },
    ],
  },
  {
    id: 'upperlower',
    name: 'Superior/Inferior',
    description: 'Superiores e inferiores, 4×/semana',
    workouts: [
      { label: 'A', name: 'Superior', weekdays: [1, 4], exerciseIds: [BENCH, PULLDOWN, OHP, ROW, BBCURL, PUSHDOWN] },
      { label: 'B', name: 'Inferior', weekdays: [2, 5], exerciseIds: [SQUAT, LEGPRESS, EXT, CURL, THRUST, CALF] },
    ],
  },
]

export function toPlanExercise(e: Exercise | CustomExercise): PlanExercise {
  const base = { exerciseId: e.id, name: e.name, muscles: e.muscles, ...PLAN_DEFAULTS }
  return 'images' in e
    ? { ...base, images: e.images, instructions: e.instructions }
    : { ...base, custom: true, images: [], instructions: [], note: e.note }
}

export function instantiateTemplate(t: PlanTemplate, catalog: Exercise[]): WorkoutPlan {
  const byId = new Map(catalog.map((e) => [e.id, e]))
  return {
    workouts: t.workouts.map((w) => ({
      id: crypto.randomUUID(),
      label: w.label,
      name: w.name,
      weekdays: [...w.weekdays],
      exercises: w.exerciseIds.flatMap((id) => (byId.has(id) ? [toPlanExercise(byId.get(id)!)] : [])),
    })),
  }
}
