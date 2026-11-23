import { formatDayMonth } from '@/lib/date'
import { useToday } from '@/lib/useToday'
import { Overlay } from '@/components/Overlay'
import { Badge } from '@/components/ui/badge'
import { BackHeader } from '@/components/BackHeader'
import { cn } from '@/lib/utils'
import { computeAchievements } from './achievements'
import { AchievementIcon } from './AchievementIcon'
import { useEvolution } from './useEvolution'

export function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const { today } = useToday()
  const list = computeAchievements(useEvolution(), today)

  return (
    <Overlay>
      <BackHeader title="Conquistas" onBack={onClose}>
        <Badge variant="outline" className="rounded-md text-caption text-text-2">{`${list.filter((x) => x.earnedAt).length} de ${list.length}`}</Badge>
      </BackHeader>
      <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
        {[...list].sort((x, y) => Number(!x.earnedAt) - Number(!y.earnedAt)).map((x) => (
          <li key={x.id} className="flex flex-col items-center gap-1.5 text-center text-xs text-text-2">
            <span
              role="img"
              aria-label={x.earnedAt ? 'Ganha' : 'Bloqueada'}
              className={cn('flex size-14.5 items-center justify-center rounded-2xl border', x.earnedAt ? 'border-success-line bg-success-bg text-success-fg' : 'border-border bg-surface text-border-strong')}
            >
              <AchievementIcon id={x.id} />
            </span>
            <b className="text-meta font-semibold text-strong">{x.title}</b>
            {x.earnedAt ? formatDayMonth(x.earnedAt) : x.progress}
          </li>
        ))}
      </ul>
    </Overlay>
  )
}
