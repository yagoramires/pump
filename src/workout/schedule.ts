import { weekday } from '@/lib/date'
import type { Workout, WorkoutPlan } from './types'

export const workoutForDate = (plan: WorkoutPlan, date: string): Workout | undefined =>
  plan.workouts.find((w) => w.weekdays.includes(weekday(date)))
