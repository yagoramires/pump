import type { DietDay } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { dayOf, resetDay, touched, updateDay } from './day'

type Act = (f: (d: DietDay) => DietDay) => void

export function useDietToday() {
  const { now, today, tick } = useToday()
  const [plan, setPlan] = usePersisted('dietPlan')
  const [log, setLog] = usePersisted('dietLog')
  const day = dayOf(log, plan, today)
  const menu = day && plan.menus.find((m) => m.id === day.menuId)

  const act: Act = (f) => {
    const date = tick()
    setLog((l) => updateDay(l, plan, date, f))
  }
  const switchMenu = (menuId: string, date: string) => {
    setLog((l) => resetDay(l, date))
    setPlan((p) => ({ ...p, lastMenuId: menuId }))
  }
  const pickMenu = (menuId: string): { menuId: string; date: string } | undefined => {
    const date = tick()
    const d = dayOf(log, plan, date)
    if (d && touched(d)) return { menuId, date }
    switchMenu(menuId, date)
  }

  return { now, today, tick, plan, day, menu, act, pickMenu, switchMenu }
}
