import type { DietLog, WaterLog } from '@/diet/types'
import { addDays } from '@/lib/date'
import { formatDec } from '@/lib/number'
import { Card } from '@/components/ui/card'
import { dietStats } from './dietStats'

const ROW = 'flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm'

/** últimos 30 dias incluindo hoje (hoje entra ao vivo; as conquistas só olham dias fechados); água só com registro na janela */
export function DietCard({ log, water, today }: { log: DietLog; water: WaterLog; today: string }) {
  const s = dietStats(log, water, addDays(today, -29), today)
  const rows = s.days
    ? [
        s.avgKcal !== undefined && { label: 'Média de kcal', value: formatDec(s.avgKcal), goal: s.avgGoal && ` / ${formatDec(s.avgGoal)}` },
        { label: 'Dias no plano', value: `${s.fullDays} de ${s.days}` },
        s.waterDays !== undefined && { label: 'Água na meta', value: `${s.waterDays} de ${s.days}` },
        { label: 'Livres no mês', value: String(s.freeUses) },
      ].filter((r) => !!r)
    : []
  return (
    <Card className="overflow-hidden">
      <div className="px-3.5 pt-3 pb-2 text-[15px] font-semibold text-strong">Dieta · 30 dias</div>
      {!rows.length && <p className="border-t border-line px-3.5 py-2.5 text-sm text-text-2">Marque as refeições na aba Dieta pra ver aqui.</p>}
      {rows.map(({ label, value, goal }) => (
        <div key={label} className={ROW}>
          <span className="text-text-2">{label}</span>
          <span className="tabular-nums">
            <b className="font-semibold text-strong">{value}</b>
            {goal && <span className="text-text-2">{goal}</span>}
          </span>
        </div>
      ))}
    </Card>
  )
}
