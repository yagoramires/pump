import { formatDayMonth, todayKey } from '@/lib/date'
import { Overlay } from '@/components/Overlay'
import { Badge } from '@/components/ui/badge'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { computeAchievements } from './achievements'
import { AchievementIcon } from './AchievementIcon'
import { useEvolution } from './useEvolution'

export function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const list = computeAchievements(useEvolution(), todayKey())

  return (
    <Overlay>
      <BackHeader title="Conquistas" onBack={onClose}>
        <Badge variant="outline" className="rounded-md text-[11px] text-text-2">{`${list.filter((x) => x.earnedAt).length} de ${list.length}`}</Badge>
      </BackHeader>
      <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
        {[...list].sort((x, y) => Number(!x.earnedAt) - Number(!y.earnedAt)).map((x) => (
          <li key={x.id} className="flex flex-col items-center gap-1.5 text-center text-xs text-text-2">
            <span
              role="img"
              aria-label={x.earnedAt ? 'Ganha' : 'Bloqueada'}
              className={cn('flex size-[58px] items-center justify-center rounded-[18px] border', x.earnedAt ? 'border-accent-line bg-accent-bg text-accent' : 'border-border bg-surface text-border-strong')}
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
