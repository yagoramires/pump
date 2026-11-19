import { GROUPS, muscleGroup } from '@/catalog/muscles'
import { repsNumber } from '@/workout/reps'
import { markedSets } from '@/workout/session'
import { completedSessions, exerciseHistory, exerciseVolume, loadPoints, maxLoad } from '@/workout/stats'
import type { SessionExercise, SetDone, WorkoutLog } from '@/workout/types'
import type { Point } from './measurements'
import { inPeriod, type Period } from './chart'

type LoadMode = 'load' | 'reps'
export const MODE_TEXT = {
  load: { unit: 'kg', top: 'Carga máx.', total: 'Volume' },
  reps: { unit: 'reps', top: 'Máx. reps', total: 'Total de reps' },
} as const satisfies Record<LoadMode, unknown>
export interface Measure { last: number; delta?: number }
export interface LoadRow { exerciseId: string; name: string; mode: LoadMode; sessions: number; top: Measure; total: Measure }
export interface Tally { up: number; down: number; same: number }
interface ExerciseLoads extends LoadRow {
  group: { token: string; label: string }
  topPoints: Point[]
  totalPoints: Point[]
  history: { date: string; sets: SetDone[] }[]
}

const measure = (points: Point[]): Measure => ({
  last: points[points.length - 1].value,
  ...(points.length > 1 && { delta: points[points.length - 1].value - points[0].value }),
})

const repsOf = (e: SessionExercise) => markedSets(e).map((s) => repsNumber(s.reps))

function calcAll(log: WorkoutLog, period: Period, today: string): ExerciseLoads[] {
  const history = exerciseHistory(completedSessions(log).filter((s) => inPeriod(period, s.date, today)))
  return [...history].map(([exerciseId, entries]) => {
    const latest = entries[entries.length - 1].e
    const loads = loadPoints(entries)
    const mode: LoadMode = loads.length ? 'load' : 'reps'
    const counted = mode === 'load' ? entries.filter(({ e }) => maxLoad(e) > 0) : entries
    const pts = (f: (e: SessionExercise) => number): Point[] => counted.map(({ date, e }) => ({ date, value: f(e) }))
    const topPoints = mode === 'load' ? loads : pts((e) => Math.max(...repsOf(e)))
    const totalPoints = pts(mode === 'load' ? exerciseVolume : (e) => repsOf(e).reduce((a, n) => a + n, 0))
    const token = muscleGroup(latest.muscles)
    return {
      exerciseId, name: latest.name, mode, sessions: counted.length,
      top: measure(topPoints), total: measure(totalPoints),
      group: GROUPS.find((g) => g.token === token) ?? GROUPS[GROUPS.length - 1],
      topPoints, totalPoints,
      history: entries.map(({ date, e }) => ({ date, sets: markedSets(e) })).reverse(),
    }
  })
}

const tally = (rows: LoadRow[], key: 'top' | 'total'): Tally => {
  const t = { up: 0, down: 0, same: 0 }
  for (const { [key]: { delta } } of rows) if (delta !== undefined) t[delta > 0 ? 'up' : delta < 0 ? 'down' : 'same']++
  return t
}

export function loadsSummary(log: WorkoutLog, period: Period, today: string) {
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

export const exerciseLoads = (log: WorkoutLog, exerciseId: string, period: Period, today: string): ExerciseLoads | undefined =>
  calcAll(log, period, today).find((x) => x.exerciseId === exerciseId)
