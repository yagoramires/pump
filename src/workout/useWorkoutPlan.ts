import { usePersisted } from '@/storage/db'
import { savePlan } from './plan'
import type { WorkoutPlan } from './types'

export function useWorkoutPlan() {
  const [plan, setPlan] = usePersisted('workoutPlan')
  const replacePlan = (next: WorkoutPlan) => setPlan((prev) => savePlan(prev, next))
  return { plan, replacePlan, setPlan }
}
