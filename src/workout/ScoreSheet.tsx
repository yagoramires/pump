import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { SheetBody } from '@/components/SheetRow'
import { formatDec } from '@/lib/number'
import type { sessionScore, Trend } from './score'

const ROWS: [Trend, string, string][] = [
  ['up', 'Subiu', '1 ponto'],
  ['same', 'Igual', '0,7'],
  ['new', 'Primeira vez', '0,7'],
  ['timed', 'Cardio e por tempo', '0,7'],
  ['down', 'Caiu', '0,4'],
]

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
            {ROWS.map(([t, label, pts]) => (
              <div key={t} className="flex items-baseline gap-3 border-t border-line py-2.5 text-sm first:border-t-0">
                <span className="min-w-0 flex-1 text-strong">{label}</span>
                <span className="text-faint">{pts}</span>
                <span className="w-8 text-right font-semibold text-strong tabular-nums">{count(t)}</span>
              </div>
            ))}
          </div>
          <p className="pt-3 text-meta text-text-2">Séries não feitas (puladas ou não marcadas) reduzem os pontos do exercício na proporção do que faltou.</p>
          {score.effort !== undefined && <p className="pt-2 text-meta text-text-2">{`70% desempenho (${formatDec(score.perf, 1)}) + 30% esforço (${score.effort})`}</p>}
        </SheetBody>
      </DrawerContent>
    </Drawer>
  )
}
