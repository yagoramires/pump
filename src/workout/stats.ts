import { hasMarkedSet, isSkipped, markedSets } from './session'
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
  const end = s.completedAt ? Date.parse(s.completedAt) : (now ?? new Date()).getTime()
  const ms = s.startedAt ? end - Date.parse(s.startedAt) : NaN
  return {
    done: doneSets(s).length,
    total: sets.length,
    volumeKg: sessionVolume(s),
    minutes: Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 60000)) : null,
  }
}

/** nth: qual aparição do exercício no treino de hoje (o 2º supino compara com o 2º supino); sem par, usa a 1ª */
export const previousSets = (log: WorkoutLog, today: string, exerciseId: string, nth = 0): (SetDone | null)[] => {
  const dates = Object.keys(log).filter((d) => d < today).sort().reverse()
  for (const d of dates) {
    const same = log[d].exercises.filter((e) => e.exerciseId === exerciseId)
    const ex = same[nth] ?? same[0]
    if (ex && hasMarkedSet(ex)) return ex.sets
  }
  return []
}

export const suggestedKg = (ex: { weightKg: number }, prev: (SetDone | null)[], set?: number): number =>
  (set === undefined ? prev.find(Boolean) : prev[set])?.weightKg ?? ex.weightKg

const completedBefore = (log: WorkoutLog, s: WorkoutSession) => completedSessions(log).filter((d) => d.date < s.date)

/** variação % (inteira) do volume contra a última sessão concluída do mesmo treino; sem anterior ou anterior a 0 kg → undefined */
export const volumeChange = (log: WorkoutLog, s: WorkoutSession): number | undefined => {
  const prev = completedBefore(log, s).filter((d) => d.workoutId === s.workoutId).at(-1)
  const before = prev ? sessionVolume(prev) : 0
  return before > 0 ? Math.round(((sessionVolume(s) - before) / before) * 100) : undefined
}

/** exercícios cuja maior carga de hoje passa a maior de todas as sessões concluídas antes; primeira vez, cardio e por tempo não contam */
export const sessionRecords = (log: WorkoutLog, s: WorkoutSession): { name: string; kg: number; prevKg: number }[] => {
  const history = exerciseHistory(completedBefore(log, s))
  const seen = new Set<string>()
  return s.exercises.flatMap((e) => {
    if (seen.has(e.exerciseId) || isCardio(e) || isTimed(e.reps)) return []
    seen.add(e.exerciseId)
    const kg = Math.max(...s.exercises.filter((x) => x.exerciseId === e.exerciseId).map(maxLoad))
    const prevKg = Math.max(0, ...loadPoints(history.get(e.exerciseId) ?? []).map((p) => p.value))
    return prevKg > 0 && kg > prevKg ? [{ name: e.name, kg, prevKg }] : []
  })
}
