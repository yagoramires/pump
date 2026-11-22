import type { DietLog, WaterLog } from '@/diet/types'
import { addDays } from '@/lib/date'
import { formatDec } from '@/lib/number'
import { dietStats } from './dietStats'

const ROW = 'flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm'

/** últimos 30 dias incluindo hoje (hoje entra ao vivo; as conquistas só olham dias fechados); água só com registro na janela */
const stats = (log: DietLog, water: WaterLog, today: string) => dietStats(log, water, addDays(today, -29), today)

/** "N de M dias no plano" da janela de 30 dias; sem dia registrado, nada */
export function dietSummary(log: DietLog, water: WaterLog, today: string): string | undefined {
  const s = stats(log, water, today)
  return s.days ? `${s.fullDays} de ${s.days} dias no plano` : undefined
}

/** linhas da dieta dos últimos 30 dias, sem card em volta */
export function DietRows({ log, water, today }: { log: DietLog; water: WaterLog; today: string }) {
  const s = stats(log, water, today)
  const rows = s.days
    ? [
        s.avgKcal !== undefined && { label: 'Média de kcal', value: formatDec(s.avgKcal), goal: s.avgGoal && ` / ${formatDec(s.avgGoal)}` },
        { label: 'Dias no plano', value: `${s.fullDays} de ${s.days}` },
        s.waterDays !== undefined && { label: 'Água na meta', value: `${s.waterDays} de ${s.days}` },
        { label: 'Livres no mês', value: String(s.freeUses) },
      ].filter((r) => !!r)
    : []
  if (!rows.length) return <p className="border-t border-line px-3.5 py-2.5 text-sm text-text-2">Marque as refeições na aba Dieta pra ver aqui.</p>
  return (
    <>
      {rows.map(({ label, value, goal }) => (
        <div key={label} className={ROW}>
          <span className="text-text-2">{label}</span>
          <span className="tabular-nums">
            <b className="font-semibold text-strong">{value}</b>
            {goal && <span className="text-text-2">{goal}</span>}
          </span>
        </div>
      ))}
    </>
  )
}
