import { allResolved, hasMarkedSet, markedSets, setsToDo } from './session'
import { isRest } from './rest'
import { isCardio, isTimed, repsNumber } from './reps'
import type { SessionExercise, SetDone, WorkoutSession } from './types'

const doneSets = (s: WorkoutSession) => s.exercises.flatMap(markedSets)

// por tempo: as "reps" são segundos, não entram no volume
export const exerciseVolume = (e: SessionExercise) => isTimed(e.reps) ? 0 : markedSets(e).reduce((a, d) => a + d.weightKg * repsNumber(d.reps), 0)

export const completedSessions = (sessions: WorkoutSession[]) => sessions
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
  const endIso = s.completedAt ? (s.endedAt ?? s.completedAt) : allResolved(s) && s.endedAt
  const end = endIso ? Date.parse(endIso) : (now ?? new Date()).getTime()
  const ms = s.startedAt ? end - Date.parse(s.startedAt) : NaN
  return {
    done: doneSets(s).length,
    total: s.exercises.reduce((a, e) => a + setsToDo(e), 0),
    minutes: Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 60000)) : null,
  }
}

const timeOf = (s: WorkoutSession) => s.completedAt ?? s.endedAt ?? s.startedAt ?? ''
// a lista nunca é mutada (cada mudança gera outra): a ordem vale enquanto ela viver
const newestCache = new WeakMap<WorkoutSession[], WorkoutSession[]>()
const newestFirst = (sessions: WorkoutSession[]) => {
  let list = newestCache.get(sessions)
  if (!list) newestCache.set(sessions, (list = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || timeOf(b).localeCompare(timeOf(a)))))
  return list
}

/** índice da 1ª sessão de data anterior a `today` na lista mais-recente-primeiro */
const firstBefore = (list: WorkoutSession[], today: string) => {
  let lo = 0
  let hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].date >= today) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** nth: qual aparição do exercício no treino de hoje (o 2º supino compara com o 2º supino); sem par, usa a 1ª */
export const previousSets = (sessions: WorkoutSession[], today: string, exerciseId: string, nth = 0): (SetDone | null)[] => {
  const list = newestFirst(sessions)
  for (let i = firstBefore(list, today); i < list.length; i++) {
    const s = list[i]
    const same = s.exercises.filter((e) => e.exerciseId === exerciseId)
    const ex = same[nth] ?? same[0]
    if (ex && hasMarkedSet(ex)) return ex.sets
  }
  return []
}

export const suggestedKg = (ex: { weightKg: number }, prev: (SetDone | null)[], set?: number): number =>
  (set === undefined ? prev.find(Boolean) : prev[set])?.weightKg ?? ex.weightKg


