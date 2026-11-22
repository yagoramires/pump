import type { WorkoutSession } from './types'
import { formatDec, plural } from '@/lib/number'
import { sessionStats } from './stats'
import { sessionScore } from './score'
import { formatDuration } from './summary'

export function WorkoutDayLine({ session, sessions, now }: { session: WorkoutSession; sessions: WorkoutSession[]; now?: Date }) {
  const s = sessionStats(session, now)
  return (
    <div className="min-w-0 flex-1">
      <div className="text-body font-semibold text-strong">{session.workoutName}</div>
      <div className="text-meta text-text-2 tabular-nums">{[plural(s.done, 'série', 'séries'), `nota ${formatDec(sessionScore(sessions, session).score, 1)}`, s.minutes !== null && formatDuration(s.minutes)].filter(Boolean).join(' · ')}</div>
    </div>
  )
}
