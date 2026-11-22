import { allResolved, hasMarkedSet, isSkipped, markedSets } from './session'
import { isRest } from './rest'
import { isCardio, isTimed, repsNumber } from './reps'
import type { SessionExercise, SetDone, WorkoutLog, WorkoutSession } from './types'

const doneSets = (s: WorkoutSession) => s.exercises.flatMap(markedSets)

// por tempo: as "reps" são segundos, não entram no volume
export const exerciseVolume = (e: SessionExercise) => isTimed(e.reps) ? 0 : markedSets(e).reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0)

export const completedSessions = (log: WorkoutLog) => Object.values(log)
  .filter((s) => !isRest(s) && s.completedAt)
  .sort((a, b) => a.date.localeCompare(b.date) || (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))

export const maxLoad = (e: SessionExercise) => Math.max(0, ...e.sets.map((x) => x?.weightKg ?? 0))

type Entry = { date: string; e: SessionExercise }
/** as sessões (em ordem) em que cada exercício teve série marcada; cardio e por tempo (pelo último registro) ficam de fora.
 * Exercício repetido no mesmo treino vira uma entrada só, com as séries de todas as aparições */
export function exerciseHistory(sessions: WorkoutSession[]): Map<string, Entry[]> {
  const byId = new Map<string, Entry[]>()
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!hasMarkedSet(e)) continue
      const list = byId.get(e.exerciseId)
      const last = list?.at(-1)
      if (last?.date === s.date) last.e = { ...last.e, sets: [...last.e.sets, ...e.sets] }
      else if (list) list.push({ date: s.date, e })
      else byId.set(e.exerciseId, [{ date: s.date, e }])
    }
  }
  for (const [id, list] of byId) if (isCardio(list.at(-1)!.e) || isTimed(list.at(-1)!.e.reps)) byId.delete(id)
  return byId
}

/** a maior carga de cada sessão; sessão a 0 kg (peso do corpo) não conta como carga */
export const loadPoints = (entries: Entry[]) => entries.flatMap(({ date, e }) => { const value = maxLoad(e); return value > 0 ? [{ date, value }] : [] })

export const sessionVolume = (s: WorkoutSession) => s.exercises.reduce((a, e) => a + exerciseVolume(e), 0)

export const sessionStats = (s: WorkoutSession, now?: Date) => {
  const sets = s.exercises.flatMap((e) => e.sets.filter((_, i) => !isSkipped(e, i)))
  const endIso = s.completedAt ? (s.endedAt ?? s.completedAt) : allResolved(s) && s.endedAt
  const end = endIso ? Date.parse(endIso) : (now ?? new Date()).getTime()
  const ms = s.startedAt ? end - Date.parse(s.startedAt) : NaN
  return {
    done: doneSets(s).length,
    total: sets.length,
    minutes: Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 60000)) : null,
  }
}

const timeOf = (s: WorkoutSession) => s.completedAt ?? s.endedAt ?? s.startedAt ?? ''
// o log nunca é mutado (cada mudança gera outro objeto): a ordem vale enquanto o objeto viver
const newestCache = new WeakMap<WorkoutLog, WorkoutSession[]>()
/** mais recente primeiro, por data e depois hora; não usa as chaves, que no log mesclado não são datas */
const newestFirst = (log: WorkoutLog) => {
  let list = newestCache.get(log)
  if (!list) newestCache.set(log, (list = Object.values(log).sort((a, b) => b.date.localeCompare(a.date) || timeOf(b).localeCompare(timeOf(a)))))
  return list
}

/** nth: qual aparição do exercício no treino de hoje (o 2º supino compara com o 2º supino); sem par, usa a 1ª */
export const previousSets = (log: WorkoutLog, today: string, exerciseId: string, nth = 0): (SetDone | null)[] => {
  for (const s of newestFirst(log)) {
    if (s.date >= today) continue
    const same = s.exercises.filter((e) => e.exerciseId === exerciseId)
    const ex = same[nth] ?? same[0]
    if (ex && hasMarkedSet(ex)) return ex.sets
  }
  return []
}

export const suggestedKg = (ex: { weightKg: number }, prev: (SetDone | null)[], set?: number): number =>
  (set === undefined ? prev.find(Boolean) : prev[set])?.weightKg ?? ex.weightKg


