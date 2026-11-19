import { Delta } from './Delta'
import { deltaUnit, formatMetric, formatValue, type BodyRow } from './measurements'

/** "primeiro → último unidade" e a variação de um campo do corpo */
export function BodyRowLine({ row: r }: { row: BodyRow }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-sm first:border-t-0">
      <span className="text-text-2">{r.label}</span>
      <span className="tabular-nums">
        <b className="font-semibold text-strong">{`${formatMetric(r, r.first.value)} → ${formatValue(r, r.last.value)}`}</b>
        <Delta value={r.delta} good={r.good} unit={deltaUnit(r)} className="ml-2 text-meta" />
      </span>
    </div>
  )
}
