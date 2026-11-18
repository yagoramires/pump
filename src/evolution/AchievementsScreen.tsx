import { ChevronLeft } from 'lucide-react'
import { formatDayMonth, todayKey } from '../lib/date'
import { Overlay } from '@/components/Overlay'
import { cn } from '@/lib/utils'
import { computeAchievements } from './achievements'
import { AchievementIcon } from './AchievementIcon'
import { useEvolution } from './useEvolution'

export function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const list = computeAchievements(useEvolution(), todayKey())

  return (
    <Overlay>
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onClose}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong">Conquistas</h1>
        <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-text-2">{`${list.filter((x) => x.earnedAt).length} de ${list.length}`}</span>
      </header>
      <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
        {/* ganhas primeiro, como no mockup; sort é estável e mantém a ordem dentro de cada grupo */}
        {[...list].sort((x, y) => Number(!x.earnedAt) - Number(!y.earnedAt)).map((x) => (
          <li key={x.id} className="flex flex-col items-center gap-1 text-center text-xs text-text-2">
            <span
              role="img"
              aria-label={x.earnedAt ? 'Ganha' : 'Bloqueada'}
              className={cn('mb-0.5 flex size-[58px] items-center justify-center rounded-[18px] border', x.earnedAt ? 'border-accent-line bg-accent-bg text-accent' : 'border-border bg-surface text-border-strong')}
            >
              <AchievementIcon id={x.id} />
            </span>
            <b className="text-[13px] font-semibold text-strong">{x.title}</b>
            {x.earnedAt ? formatDayMonth(x.earnedAt) : x.progress}
          </li>
        ))}
      </ul>
    </Overlay>
  )
}
