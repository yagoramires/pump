import type { DietDay } from './types'
import { formatDec, plural } from '@/lib/number'
import { daySummary } from './day'

export function DietDayLine({ day }: { day: DietDay }) {
  const s = daySummary(day)
  const sub = [
    day.menuName,
    !s.dayFree && `${s.mealsDone} de ${s.mealsTotal} refeições`,
    s.swaps > 0 && plural(s.swaps, 'troca', 'trocas'),
    s.extras > 0 && plural(s.extras, 'extra', 'extras'),
    !s.dayFree && s.free > 0 && plural(s.free, 'refeição livre', 'refeições livres'),
  ]
  return (
    <div className="min-w-0 flex-1">
      <div className="text-body font-semibold text-strong">{s.dayFree ? 'Dieta · Dia livre' : `Dieta · ${formatDec(s.kcal)} kcal`}</div>
      <div className="text-meta text-text-2 tabular-nums">{sub.filter(Boolean).join(' · ')}</div>
    </div>
  )
}
