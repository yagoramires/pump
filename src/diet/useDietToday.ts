import type { DietDay } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { dayOf, resetDay, touched, updateDay } from './day'
import { useDietPlan } from './useDietPlan'

type Act = (f: (d: DietDay) => DietDay) => void

export function useDietToday() {
  const { now, today, tick } = useToday()
  const { plan, replacePlan, selectMenu } = useDietPlan()
  const [log, setLog] = usePersisted('dietLog')
  const day = dayOf(log, plan, today)
  const menu = day && plan.menus.find((m) => m.id === day.menuId)

  const act: Act = (f) => {
    const date = tick()
    setLog((l) => updateDay(l, plan, date, f))
  }
  const switchMenu = (menuId: string, date: string) => {
    setLog((l) => resetDay(l, date))
    selectMenu(menuId)
  }
  const pickMenu = (menuId: string): { menuId: string; date: string } | undefined => {
    const date = tick()
    const d = dayOf(log, plan, date)
    if (d && touched(d)) return { menuId, date }
    switchMenu(menuId, date)
  }

  return { now, today, tick, plan, replacePlan, day, menu, act, pickMenu, switchMenu }
}
