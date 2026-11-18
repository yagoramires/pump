import type { WorkoutSession } from './types'
import { formatKg } from '@/lib/number'
import { sessionStats } from './stats'

export function WorkoutDayLine({ session, now }: { session: WorkoutSession; now: Date }) {
  const s = sessionStats(session, now)
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[15px] font-semibold text-strong">{session.workoutName}</div>
      <div className="text-[13px] text-text-2 tabular-nums">{[`${s.done} séries`, `${formatKg(s.volumeKg)} kg`, s.minutes !== null && `${s.minutes} min`].filter(Boolean).join(' · ')}</div>
    </div>
  )
}
