import { ChevronLeft, Trophy } from 'lucide-react'
import { NO_PROFILE, type Measurement, type PhotoSet, type WorkoutLog, type WorkoutPlan } from '../types'
import { usePersisted } from '../storage/db'
import { formatDayMonth, todayKey } from '../lib/date'
import { Overlay } from '@/components/Overlay'
import { cn } from '@/lib/utils'
import { computeAchievements } from './achievements'

const NO_LOG: WorkoutLog = {}
const NO_PLAN: WorkoutPlan = { workouts: [] }
const NO_MEASURES: Measurement[] = []
const NO_PHOTOS: PhotoSet[] = []

export function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const [workoutLog, , a] = usePersisted('workoutLog', NO_LOG)
  const [workoutPlan, , b] = usePersisted('workoutPlan', NO_PLAN)
  const [measurements, , c] = usePersisted('measurements', NO_MEASURES)
  const [photoSets, , d] = usePersisted('photoSets', NO_PHOTOS)
  const [profile, , e] = usePersisted('profile', NO_PROFILE)
  const list = a && b && c && d && e ? computeAchievements({ workoutLog, workoutPlan, measurements, photoSets, profile }, todayKey()) : undefined

  return (
    <Overlay>
      <header className="flex items-center gap-3 py-2">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onClose}><ChevronLeft size={18} /></button>
        <h1 className="flex-1 text-[19px] font-semibold text-strong">Conquistas</h1>
        {list && <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-text-2">{`${list.filter((x) => x.earnedAt).length} de ${list.length}`}</span>}
      </header>
      {!list ? (
        <p className="mt-3 text-sm text-text-2">Carregando…</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-x-2.5 gap-y-4">
          {list.map((x) => (
            <li key={x.id} className="flex flex-col items-center gap-1 text-center text-xs text-text-2">
              <span
                role="img"
                aria-label={x.earnedAt ? 'Ganha' : 'Bloqueada'}
                className={cn('mb-0.5 flex size-[58px] items-center justify-center rounded-[18px] border', x.earnedAt ? 'border-accent-line bg-accent-bg text-accent' : 'border-border bg-surface text-border-strong')}
              >
                <Trophy size={22} aria-hidden="true" />
              </span>
              <b className="text-[13px] font-semibold text-strong">{x.title}</b>
              {x.earnedAt ? formatDayMonth(x.earnedAt) : x.progress}
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  )
}
