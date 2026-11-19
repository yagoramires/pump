import { GROUPS, muscleGroup } from '@/catalog/muscles'
import { daysBetween } from '@/lib/date'
import { isCardio, isTimed } from '@/workout/cardio'
import { hasMarkedSet, markedSets } from '@/workout/session'
import { completedSessions, exerciseVolume, maxLoad, repsNumber } from '@/workout/stats'
import type { SessionExercise, SetDone, WorkoutLog } from '@/workout/types'
import type { Point } from './measurements'

export type LoadPeriod = '30' | '90' | 'all'
export type LoadMode = 'load' | 'reps'
export interface Measure { last: number; delta?: number }
export interface LoadRow { exerciseId: string; name: string; mode: LoadMode; sessions: number; top: Measure; total: Measure }
export interface LoadGroup { token: string; label: string; rows: LoadRow[] }
export interface Tally { up: number; down: number; same: number }
export interface LoadsSummary { top: Tally; total: Tally; groups: LoadGroup[] }
export interface ExerciseLoads extends LoadRow {
  group: { token: string; label: string }
  topPoints: Point[]
  totalPoints: Point[]
  history: { date: string; sets: SetDone[] }[]
}

interface Calc extends ExerciseLoads { muscles: string[] }

const measure = (points: Point[]): Measure => ({
  last: points[points.length - 1].value,
  ...(points.length > 1 && { delta: points[points.length - 1].value - points[0].value }),
})

const repsOf = (e: SessionExercise) => markedSets(e).map((s) => repsNumber(s.reps))

function calcAll(log: WorkoutLog, period: LoadPeriod, today: string): Calc[] {
  const byId = new Map<string, { date: string; e: SessionExercise }[]>()
  for (const s of completedSessions(log)) {
    if (period !== 'all' && daysBetween(s.date, today) > Number(period)) continue
    const seen = new Set<string>()
    for (const e of s.exercises) {
      if (seen.has(e.exerciseId)) continue
      seen.add(e.exerciseId)
      if (hasMarkedSet(e)) byId.set(e.exerciseId, [...(byId.get(e.exerciseId) ?? []), { date: s.date, e }])
    }
  }
  return [...byId].flatMap(([exerciseId, entries]) => {
    const latest = entries[entries.length - 1].e
    if (isCardio(latest) || isTimed(latest.reps)) return []
    const mode: LoadMode = entries.every(({ e }) => maxLoad(e) === 0) ? 'reps' : 'load'
    const counted = mode === 'load' ? entries.filter(({ e }) => maxLoad(e) > 0) : entries
    const pts = (f: (e: SessionExercise) => number): Point[] => counted.map(({ date, e }) => ({ date, value: f(e) }))
    const topPoints = pts(mode === 'load' ? maxLoad : (e) => Math.max(...repsOf(e)))
    const totalPoints = pts(mode === 'load' ? exerciseVolume : (e) => repsOf(e).reduce((a, n) => a + n, 0))
    const token = muscleGroup(latest.muscles)
    return [{
      exerciseId, name: latest.name, muscles: latest.muscles, mode, sessions: counted.length,
      top: measure(topPoints), total: measure(totalPoints),
      group: GROUPS.find((g) => g.token === token) ?? GROUPS[GROUPS.length - 1],
      topPoints, totalPoints,
      history: entries.map(({ date, e }) => ({ date, sets: markedSets(e) })).reverse(),
    }]
  })
}

const tally = (rows: LoadRow[], key: 'top' | 'total'): Tally => {
  const t = { up: 0, down: 0, same: 0 }
  for (const { [key]: { delta } } of rows) if (delta !== undefined) t[delta > 0 ? 'up' : delta < 0 ? 'down' : 'same']++
  return t
}

export function loadsSummary(log: WorkoutLog, period: LoadPeriod, today: string): LoadsSummary {
  const all = calcAll(log, period, today)
  const groups = GROUPS.map(({ token, label }) => ({
    token, label,
    rows: all.filter((c) => c.group.token === token)
      .map(({ exerciseId, name, mode, sessions, top, total }): LoadRow => ({ exerciseId, name, mode, sessions, top, total }))
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, 'pt-BR')),
  })).filter((g) => g.rows.length)
  const rows = groups.flatMap((g) => g.rows)
  return { top: tally(rows, 'top'), total: tally(rows, 'total'), groups }
}

export function exerciseLoads(log: WorkoutLog, exerciseId: string, period: LoadPeriod, today: string): ExerciseLoads | undefined {
  const c = calcAll(log, period, today).find((x) => x.exerciseId === exerciseId)
  if (!c) return undefined
  const { muscles: _m, ...rest } = c
  return rest
}
