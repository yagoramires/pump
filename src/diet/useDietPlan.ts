import { usePersisted } from '@/storage/db'
import { tick } from '@/lib/useToday'
import { currentMenu, savePlan } from './plan'
import { rebaseDay, touched } from './day'
import type { DietPlan } from './types'

export function useDietPlan() {
  const [plan, setPlan] = usePersisted('dietPlan')
  const [log, setLog] = usePersisted('dietLog')
  // dia sem marca já segue o plano (dayOf); o marcado é uma cópia salva, então refaz com o cardápio novo
  const replacePlan = (next: DietPlan) => {
    const saved = setPlan((prev) => savePlan(prev, next))
    const date = tick()
    const d = log[date]
    if (!d || !touched(d) || saved.menus.length === 0) return
    setLog((l) => {
      const cur = l[date] ?? d
      return { ...l, [date]: rebaseDay(cur, saved.menus.find((m) => m.id === cur.menuId) ?? currentMenu(saved)!) }
    })
  }
  const selectMenu = (lastMenuId: string) => setPlan((prev) => ({ ...prev, lastMenuId }))
  return { plan, replacePlan, selectMenu }
}
