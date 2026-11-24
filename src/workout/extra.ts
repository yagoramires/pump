import { toPlanExercise } from './exercises'
import { clearRest, isUnfinishedWorkout, startSession } from './session'
import { isCardio } from './reps'
import type { CustomExercise, Exercise, PlanExercise, WorkoutLog, WorkoutSession } from './types'

export const EXTRA_ID = 'extra'
export const CARDIO_ID = 'cardio'

export const startExtra = (date: string, now = new Date()): WorkoutSession => ({
  date, startedAt: now.toISOString(), workoutId: EXTRA_ID, workoutLabel: 'Extra', workoutName: 'Treino extra', exercises: [],
})

export const startCardio = (date: string, exercises: PlanExercise[], name = 'Somente cardio') =>
  startSession({ id: CARDIO_ID, label: 'Cardio', name, exercises }, date)

// fora do catálogo: 1 série com a duração em `reps` é o que isCardio reconhece
const cardioExercise = (exerciseId: string, name: string, reps: string): PlanExercise =>
  ({ exerciseId, name, reps, sets: 1, weightKg: 0, restSec: 0, muscles: [], images: [], instructions: [] })

export const CARDIO_ACTIVITIES = [
  { exerciseId: 'cardio-bicicleta', name: 'Bicicleta' },
  { exerciseId: 'cardio-corrida', name: 'Corrida' },
  { exerciseId: 'cardio-caminhada', name: 'Caminhada' },
  { exerciseId: 'cardio-esteira', name: 'Esteira' },
  { exerciseId: 'cardio-eliptico', name: 'Elíptico' },
  { exerciseId: 'cardio-escada', name: 'Escada' },
]

// registrados como cardio: uma série com a duração, sem carga nem músculo
export const SPORT_ACTIVITIES = [
  { exerciseId: 'esporte-futebol', name: 'Futebol' },
  { exerciseId: 'esporte-tenis', name: 'Tênis' },
  { exerciseId: 'esporte-beach-tennis', name: 'Beach tennis' },
  { exerciseId: 'esporte-padel', name: 'Padel' },
  { exerciseId: 'esporte-volei', name: 'Vôlei' },
  { exerciseId: 'esporte-basquete', name: 'Basquete' },
  { exerciseId: 'esporte-natacao', name: 'Natação' },
  { exerciseId: 'esporte-luta', name: 'Luta' },
]

export type Activity = { exerciseId: string; name: string }

/** sessão avulsa de uma atividade só: o nome do treino é o da atividade */
export const startActivity = (date: string, activity: Activity, minutes: number) =>
  startCardio(date, [cardioExercise(activity.exerciseId, activity.name, `${minutes} min`)], activity.name)

export function switchCardio(s: WorkoutSession, idx: number, activity: Activity): WorkoutSession {
  const e = s.exercises[idx]
  if (!e || !isCardio(e) || e.name === activity.name) return s
  const swapped = { ...cardioExercise(activity.exerciseId, activity.name, e.reps), sets: e.sets, skipped: e.skipped }
  // a sessão avulsa leva o nome da atividade; trocar a atividade troca o nome junto
  const workoutName = s.workoutId === CARDIO_ID && s.workoutName === e.name ? activity.name : s.workoutName
  return { ...s, workoutName, exercises: s.exercises.map((x, i) => (i === idx ? swapped : x)) }
}

export function addExtraExercise(s: WorkoutSession, e: Exercise | CustomExercise, sets: number): WorkoutSession {
  const { sets: _planSets, ...ex } = toPlanExercise(e)
  return { ...s, exercises: [...s.exercises, { ...ex, sets: Array(sets).fill(null) }] }
}

export const removeExercise = (s: WorkoutSession, idx: number): WorkoutSession =>
  clearRest({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) })

/** ficha e extras numa lista só: lista e não log porque o mesmo dia pode ter os dois */
export const trainingSessions = (workoutLog: WorkoutLog, extraLog: WorkoutLog): WorkoutSession[] => [...Object.values(workoutLog), ...Object.values(extraLog)]

export const unfinishedExtra = (extraLog: WorkoutLog, today: string): WorkoutSession | undefined =>
  Object.values(extraLog)
    .filter((s) => s.date < today && isUnfinishedWorkout(s))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
