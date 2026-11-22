import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { formatDec } from '@/lib/number'
import { PERF_WEIGHT, POINTS, type sessionScore, type Trend } from './score'

const ROWS: [Trend, string][] = [['up', 'Subiu'], ['same', 'Igual'], ['new', 'Primeira vez'], ['timed', 'Cardio e por tempo'], ['down', 'Caiu']]
const pointsText = (t: Trend) => (POINTS[t] === 1 ? '1 ponto' : formatDec(POINTS[t], 1))
const pct = (n: number) => `${Math.round(n * 100)}%`

/** a conta da Nota: mesma fórmula de sessionScore, só explicada */
export function ScoreSheet({ score, onClose }: { score: ReturnType<typeof sessionScore>; onClose: () => void }) {
  const count = (t: Trend) => score.rows.filter((r) => r.trend === t).length
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <SheetBody>
          <DrawerTitle className="text-title font-semibold text-strong">{`Nota ${formatDec(score.score, 1)} de 10`}</DrawerTitle>
          <DrawerDescription className="pb-3 text-meta text-text-2">Cada exercício vale pontos conforme a melhor série de hoje comparada à da última vez.</DrawerDescription>
          <div className="flex flex-col">
            {ROWS.map(([t, label]) => (
              <div key={t} className="flex items-baseline gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
                <span className="min-w-0 flex-1 text-strong">{label}</span>
                <span className="text-faint">{pointsText(t)}</span>
                <span className="w-8 text-right font-semibold text-strong tabular-nums">{count(t)}</span>
              </div>
            ))}
          </div>
          <p className="pt-3 text-meta text-text-2">Séries não feitas (puladas ou não marcadas) reduzem os pontos do exercício na proporção do que faltou.</p>
          {score.effort !== undefined && <p className="pt-2 text-meta text-text-2">{`${pct(PERF_WEIGHT)} desempenho (${formatDec(score.perf, 1)}) + ${pct(1 - PERF_WEIGHT)} esforço (${score.effort})`}</p>}
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
