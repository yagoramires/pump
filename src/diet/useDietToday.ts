import type { DietDay } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { dayOf, resetDay, touched, updateDay } from './day'
import { useDietPlan } from './useDietPlan'

type Act = (f: (d: DietDay) => DietDay) => void

export function useDietToday() {
  const { now, today, tick } = useToday()
  const { plan, selectMenu } = useDietPlan()
  const [log, setLog] = usePersisted('dietLog')
  const day = dayOf(log, plan, today)
  const menu = day && plan.menus.find((m) => m.id === day.menuId)

  const act: Act = (f) => {
    const date = tick()
    setLog((l) => updateDay(l, plan, date, f))
  }
  /** troca já; se o dia tem marca, devolve a troca pra confirmar (ela apaga o dia de agora, mesmo confirmada depois da meia-noite) */
  const pickMenu = (menuId: string): (() => void) | undefined => {
    const date = tick()
    const go = () => {
      setLog((l) => resetDay(l, date))
      selectMenu(menuId)
    }
    const d = dayOf(log, plan, date)
    if (d && touched(d)) return go
    go()
  }

  return { now, today, tick, plan, day, menu, act, pickMenu }
}
