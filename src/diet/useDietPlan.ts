import { usePersisted } from '@/storage/db'
import { savePlan } from './plan'
import type { DietPlan } from './types'

export function useDietPlan() {
  const [plan, setPlan] = usePersisted('dietPlan')
  const replacePlan = (next: DietPlan) => setPlan((prev) => savePlan(prev, next))
  const selectMenu = (lastMenuId: string) => setPlan((prev) => ({ ...prev, lastMenuId }))
  return { plan, replacePlan, selectMenu }
}
