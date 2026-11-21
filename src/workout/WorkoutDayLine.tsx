import type { WorkoutLog, WorkoutSession } from './types'
import { formatDec, plural } from '@/lib/number'
import { sessionStats } from './stats'
import { sessionScore } from './score'

export function WorkoutDayLine({ session, log, now }: { session: WorkoutSession; log: WorkoutLog; now?: Date }) {
  const s = sessionStats(session, now)
  return (
    <div className="min-w-0 flex-1">
      <div className="text-body font-semibold text-strong">{session.workoutName}</div>
      <div className="text-meta text-text-2 tabular-nums">{[plural(s.done, 'série', 'séries'), `nota ${formatDec(sessionScore(log, session).score, 1)}`, s.minutes !== null && `${s.minutes} min`].filter(Boolean).join(' · ')}</div>
    </div>
  )
}
