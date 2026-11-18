import type { DietDay } from './types'
import { usePersisted } from '@/storage/db'
import { useToday } from '@/lib/useToday'
import { dayOf, resetDay, touched, updateDay } from './day'

export type Act = (f: (d: DietDay) => DietDay) => void

/** o dia de dieta de hoje e as ações sobre ele; toda ação relê a hora (`tick`) e grava no dia que ela devolve */
export function useDietToday() {
  const { now, today, tick } = useToday()
  const [plan, setPlan] = usePersisted('dietPlan')
  const [log, setLog] = usePersisted('dietLog')
  const day = dayOf(log, plan, today)
  const menu = day && plan.menus.find((m) => m.id === day.menuId) // cardápio do dia (apagado: nenhum)

  const act: Act = (f) => {
    const date = tick()
    setLog((l) => updateDay(l, plan, date, f))
  }
  const switchMenu = (menuId: string, date: string) => {
    setLog((l) => resetDay(l, date))
    setPlan((p) => ({ ...p, lastMenuId: menuId }))
  }
  /** troca direto se nada foi marcado; senão devolve o pedido pra confirmar, com o mesmo dia da decisão */
  const pickMenu = (menuId: string): { menuId: string; date: string } | undefined => {
    const date = tick()
    const d = dayOf(log, plan, date)
    if (d && touched(d)) return { menuId, date }
    switchMenu(menuId, date)
  }

  return { now, today, tick, plan, day, menu, act, pickMenu, switchMenu }
}
